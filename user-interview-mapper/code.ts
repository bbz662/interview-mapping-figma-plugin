// code.ts

// Interfaces
interface KACard {
  id: string;
  event: string;
  innerVoice: string;
  value: string;
}

interface Cluster {
  id: string;
  name: string;
  representingValue: string;
  kaCards: string[];
}

interface Connection {
  from: string;
  to: string;
  type: 'strong' | 'weak';
  description: string;
  relatedKACards: string[];
}

interface KAAnalysis {
  kaCards: KACard[];
  clusters: Cluster[];
  connections: Connection[];
}

interface AnalysisResult {
  kaAnalysis: KAAnalysis;
}

interface Size {
  width: number;
  height: number;
}

// Main code
figma.showUI(__html__);

figma.showUI(__html__, { width: 600, height: 600 });

figma.ui.onmessage = async (msg: { type: string; result?: AnalysisResult; error?: string; width?: number; height?: number }) => {
  if (msg.type === 'analysis-complete') {
    if (msg.result) {
      try {
        await renderAnalysisResults(msg.result);
        figma.notify('Analysis rendered successfully!');
      } catch (error) {
        console.error('Error rendering analysis results:', error);
        figma.notify('An error occurred while rendering the analysis results.', { error: true });
      }
    } else if (msg.error) {
      figma.notify(`Error: ${msg.error}`, { error: true });
    }
  } else if (msg.type === 'resize') {
    if (msg.width && msg.height) {
      figma.ui.resize(msg.width, msg.height);
    }
  }
};

async function renderAnalysisResults(result: AnalysisResult) {
  const cardSizes = calculateCardSizes(result.kaAnalysis.kaCards);
  const clusterSizes = calculateClusterSizes(result.kaAnalysis.clusters, cardSizes);
  const frameSize = calculateFrameSize(clusterSizes);
  const clusterPositions = calculateClusterPositions(clusterSizes, frameSize);

  const frame = figma.createFrame();
  frame.name = 'KA Analysis';
  frame.resize(frameSize.width, frameSize.height);

  await renderClusters(result.kaAnalysis.clusters, result.kaAnalysis.kaCards, frame, clusterPositions, clusterSizes, cardSizes);
}

function calculateClusterSizes(clusters: Cluster[], cardSizes: Map<string, Size>): Map<string, Size> {
  const sizes = new Map<string, Size>();
  const titleHeight = 40;
  const padding = 20;
  const cardSpacing = 10;

  clusters.forEach(cluster => {
    let maxCardWidth = 0;
    let totalCardHeight = 0;

    cluster.kaCards.forEach(cardId => {
      const cardSize = cardSizes.get(cardId);
      if (cardSize) {
        maxCardWidth = Math.max(maxCardWidth, cardSize.width);
        totalCardHeight += cardSize.height + cardSpacing;
      }
    });

    const width = maxCardWidth + padding * 2;
    const height = titleHeight + totalCardHeight + padding * 2;

    sizes.set(cluster.id, { width, height });
  });

  return sizes;
}

function calculateClusterPositions(clusterSizes: Map<string, Size>, frameSize: Size): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  let currentX = 20;

  clusterSizes.forEach((size, clusterId) => {
    positions.set(clusterId, { x: currentX, y: 20 });
    currentX += size.width + 20;
  });

  return positions;
}

function calculateFrameSize(clusterSizes: Map<string, Size>): Size {
  const padding = 40;
  let totalWidth = 0;
  let maxHeight = 0;

  clusterSizes.forEach(size => {
    totalWidth += size.width + padding;
    maxHeight = Math.max(maxHeight, size.height);
  });

  return { width: totalWidth, height: maxHeight + padding * 2 };
}

async function renderRelationshipLabels(connections: Connection[], parent: FrameNode, positions: Map<string, { x: number, y: number }>, sizes: Map<string, { width: number, height: number }>) {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  for (const connection of connections) {
    const fromPos = positions.get(connection.from);
    const toPos = positions.get(connection.to);
    const fromSize = sizes.get(connection.from);
    const toSize = sizes.get(connection.to);
    if (fromPos && toPos && fromSize && toSize) {
      const midX = (fromPos.x + fromSize.width / 2 + toPos.x + toSize.width / 2) / 2;
      const midY = (fromPos.y + fromSize.height / 2 + toPos.y + toSize.height / 2) / 2;

      const labelText = figma.createText();
      labelText.characters = connection.type;
      labelText.fontSize = 12;
      labelText.textAlignHorizontal = 'CENTER';
      labelText.textAlignVertical = 'CENTER';
      labelText.resize(100, 20);
      labelText.x = midX - 50;
      labelText.y = midY - 10;

      const labelBackground = figma.createRectangle();
      labelBackground.resize(labelText.width + 10, labelText.height + 6);
      labelBackground.x = labelText.x - 5;
      labelBackground.y = labelText.y - 3;
      labelBackground.cornerRadius = 4;
      labelBackground.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

      parent.appendChild(labelBackground);
      parent.appendChild(labelText);
    }
  }
}

async function renderClusters(clusters: Cluster[], kaCards: KACard[], parent: FrameNode, positions: Map<string, { x: number; y: number }>, clusterSizes: Map<string, Size>, cardSizes: Map<string, Size>) {
  for (const cluster of clusters) {
    const position = positions.get(cluster.id);
    const size = clusterSizes.get(cluster.id);
    if (!position || !size) continue;

    const clusterNode = figma.createFrame();
    clusterNode.name = cluster.name;
    clusterNode.resize(size.width, size.height);
    clusterNode.x = position.x;
    clusterNode.y = position.y;
    clusterNode.cornerRadius = 8;
    clusterNode.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 1 } }];

    // Cluster title
    const titleBackground = figma.createRectangle();
    titleBackground.resize(size.width, 40);
    titleBackground.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 0.8 } }];
    clusterNode.appendChild(titleBackground);

    const titleText = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    titleText.fontName = { family: "Inter", style: "Bold" };
    titleText.characters = cluster.name;
    titleText.fontSize = 16;
    titleText.x = 10;
    titleText.y = 10;
    titleText.textAutoResize = 'WIDTH_AND_HEIGHT';
    clusterNode.appendChild(titleText);

    // Render KA cards
    let currentY = 50;
    for (const cardId of cluster.kaCards) {
      const card = kaCards.find(c => c.id === cardId);
      const cardSize = cardSizes.get(cardId);
      if (card && cardSize) {
        const cardNode = await renderKACard(card, cardSize);
        cardNode.x = 10;
        cardNode.y = currentY;
        clusterNode.appendChild(cardNode);
        currentY += cardSize.height + 10;
      }
    }

    parent.appendChild(clusterNode);
  }
}

async function renderKACard(card: KACard, size: Size): Promise<FrameNode> {
  const cardNode = figma.createFrame();
  cardNode.name = `KA Card ${card.id}`;
  cardNode.resize(size.width, size.height);
  cardNode.cornerRadius = 4;
  cardNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const eventLabel = createLabel("出来事", 10, 10);
  const eventText = createContent(card.event, 10, 25, size.width - 20, size.height / 2 - 30, "Bold");

  const innerVoiceLabel = createLabel("心の声", 10, size.height / 2);
  const innerVoiceText = createContent(card.innerVoice, 10, size.height / 2 + 15, size.width / 2 - 15, size.height / 2 - 25);

  const valueLabel = createLabel("価値", size.width / 2 + 5, size.height / 2);
  const valueText = createContent(card.value, size.width / 2 + 5, size.height / 2 + 15, size.width / 2 - 15, size.height / 2 - 25);

  cardNode.appendChild(eventLabel);
  cardNode.appendChild(eventText);
  cardNode.appendChild(innerVoiceLabel);
  cardNode.appendChild(innerVoiceText);
  cardNode.appendChild(valueLabel);
  cardNode.appendChild(valueText);

  return cardNode;
}

function createLabel(text: string, x: number, y: number): TextNode {
  const label = figma.createText();
  label.characters = text;
  label.fontSize = 10;
  label.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  label.x = x;
  label.y = y;
  return label;
}

function createContent(text: string, x: number, y: number, width: number, height: number, style: "Regular" | "Bold" = "Regular"): TextNode {
  const content = figma.createText();
  content.characters = text;
  content.fontSize = 12;
  content.fontName = { family: "Inter", style: style };
  content.x = x;
  content.y = y;
  content.textAutoResize = 'HEIGHT';
  content.resize(width, height);
  return content;
}

function calculateCardSizes(kaCards: KACard[]): Map<string, Size> {
  const sizes = new Map<string, Size>();
  const minWidth = 300;
  const minHeight = 120;
  const padding = 20;

  kaCards.forEach(card => {
    const eventLines = Math.ceil(card.event.length / 30);
    const innerVoiceLines = Math.ceil(card.innerVoice.length / 20);
    const valueLines = Math.ceil(card.value.length / 20);

    const width = Math.max(minWidth, card.event.length * 7 + padding * 2);
    const height = Math.max(minHeight, (eventLines + Math.max(innerVoiceLines, valueLines)) * 20 + padding * 3);

    sizes.set(card.id, { width, height });
  });

  return sizes;
}
