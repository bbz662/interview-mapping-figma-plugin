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
  const frame = figma.createFrame();
  frame.name = 'KA Analysis';
  frame.resize(2000, 1600);

  const clusterPositions = calculateClusterPositions(result.kaAnalysis.clusters, result.kaAnalysis.connections);
  await renderClusters(result.kaAnalysis.clusters, result.kaAnalysis.kaCards, frame, clusterPositions);
  await renderRelationshipLabels(result.kaAnalysis.connections, frame, clusterPositions);
}

function calculateClusterPositions(clusters: Cluster[], connections: Connection[]): Map<string, { x: number, y: number }> {
  const positions = new Map<string, { x: number, y: number }>();
  const clusterSize = 400;
  const padding = 100;
  
  // Initialize positions in a grid
  clusters.forEach((cluster, index) => {
    positions.set(cluster.id, {
      x: (index % 3) * (clusterSize + padding),
      y: Math.floor(index / 3) * (clusterSize + padding)
    });
  });

  // Adjust positions based on connections
  connections.forEach(connection => {
    const fromPos = positions.get(connection.from);
    const toPos = positions.get(connection.to);
    if (fromPos && toPos) {
      // Move connected clusters closer together
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;
      const strength = connection.type === 'strong' ? 0.3 : 0.1;

      fromPos.x += (midX - fromPos.x) * strength;
      fromPos.y += (midY - fromPos.y) * strength;
      toPos.x += (midX - toPos.x) * strength;
      toPos.y += (midY - toPos.y) * strength;
    }
  });

  return positions;
}

async function renderClusters(clusters: Cluster[], kaCards: KACard[], parent: FrameNode, positions: Map<string, { x: number, y: number }>) {
  const clusterSize = 400;

  for (const cluster of clusters) {
    const position = positions.get(cluster.id);
    if (!position) continue;

    const clusterNode = figma.createFrame();
    clusterNode.name = cluster.name;
    clusterNode.resize(clusterSize, clusterSize);
    clusterNode.x = position.x;
    clusterNode.y = position.y;
    clusterNode.cornerRadius = 8;
    clusterNode.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 1 } }];

    const titleText = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    titleText.fontName = { family: "Inter", style: "Bold" };
    titleText.characters = cluster.name;
    titleText.fontSize = 16;
    titleText.x = 10;
    titleText.y = 10;
    titleText.textAutoResize = 'WIDTH_AND_HEIGHT';

    clusterNode.appendChild(titleText);

    const clusterCards = kaCards.filter(card => 
      cluster.kaCards.some(kaCardId => kaCardId === card.id)
    );
    await renderKACards(clusterCards, clusterNode);

    parent.appendChild(clusterNode);
  }
}

async function renderRelationshipLabels(connections: Connection[], parent: FrameNode, positions: Map<string, { x: number, y: number }>) {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  for (const connection of connections) {
    const fromPos = positions.get(connection.from);
    const toPos = positions.get(connection.to);
    if (fromPos && toPos) {
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;

      const labelText = figma.createText();
      labelText.characters = connection.type;
      labelText.fontSize = 12;
      labelText.textAlignHorizontal = 'CENTER';
      labelText.textAlignVertical = 'CENTER';
      labelText.resize(100, 20);
      labelText.x = midX - 50;
      labelText.y = midY - 10;

      // Create a background for the label
      const labelBackground = figma.createRectangle();
      labelBackground.resize(labelText.width + 10, labelText.height + 6);
      labelBackground.x = labelText.x - 5;
      labelBackground.y = labelText.y - 3;
      labelBackground.cornerRadius = 4;
      labelBackground.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

      // Group the label and its background
      const labelGroup = figma.group([labelBackground, labelText], parent);
      labelGroup.name = `Relationship: ${connection.from} - ${connection.to}`;

      parent.appendChild(labelGroup);
    }
  }
}


async function renderKACards(cards: KACard[], parent: FrameNode) {
  const cardWidth = 180;
  const cardHeight = 100;
  const cardPadding = 10;

  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const x = cardPadding + (i % 2) * (cardWidth + cardPadding);
    const y = 40 + Math.floor(i / 2) * (cardHeight + cardPadding);

    const cardNode = figma.createFrame();
    cardNode.name = `KA Card ${card.id}`;
    cardNode.resize(cardWidth, cardHeight);
    cardNode.x = x;
    cardNode.y = y;
    cardNode.cornerRadius = 4;
    cardNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    const eventText = figma.createText();
    eventText.characters = card.event;
    eventText.fontSize = 12;
    eventText.x = 5;
    eventText.y = 5;
    eventText.textAutoResize = 'HEIGHT';
    eventText.resize(cardWidth - 10, 20);

    const valueText = figma.createText();
    valueText.characters = card.value;
    valueText.fontSize = 10;
    valueText.x = 5;
    valueText.y = cardHeight - 20;
    valueText.textAutoResize = 'HEIGHT';
    valueText.resize(cardWidth - 10, 15);

    cardNode.appendChild(eventText);
    cardNode.appendChild(valueText);
    parent.appendChild(cardNode);
  }
}
