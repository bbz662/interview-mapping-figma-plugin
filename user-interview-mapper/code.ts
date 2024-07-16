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
  frame.resize(2000, 1600);  // Increased size to accommodate more content

  await renderClusters(result.kaAnalysis.clusters, result.kaAnalysis.kaCards, frame);
  await renderConnections(result.kaAnalysis.connections, frame);
}

async function renderClusters(clusters: Cluster[], kaCards: KACard[], parent: FrameNode) {
  const clusterSize = 400;
  const padding = 40;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const x = (i % 3) * (clusterSize + padding);
    const y = Math.floor(i / 3) * (clusterSize + padding);

    const clusterNode = figma.createFrame();
    clusterNode.name = cluster.name;
    clusterNode.resize(clusterSize, clusterSize);
    clusterNode.x = x;
    clusterNode.y = y;
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

    // Render KA cards for this cluster (using Array.prototype.some for ES6 compatibility)
    const clusterCards = kaCards.filter(card => 
      cluster.kaCards.some(kaCardId => kaCardId === card.id)
    );
    await renderKACards(clusterCards, clusterNode);

    parent.appendChild(clusterNode);
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

async function renderConnections(connections: Connection[], parent: FrameNode) {
  for (const connection of connections) {
    const fromNode = parent.findChild(n => n.name === connection.from) as FrameNode;
    const toNode = parent.findChild(n => n.name === connection.to) as FrameNode;

    if (fromNode && toNode) {
      const line = figma.createLine();
      line.x = fromNode.x + fromNode.width / 2;
      line.y = fromNode.y + fromNode.height / 2;
      line.strokeWeight = connection.type === 'strong' ? 2 : 1;
      line.strokeCap = 'ROUND';
      line.strokeJoin = 'ROUND';
      line.resize(
        toNode.x + toNode.width / 2 - line.x,
        toNode.y + toNode.height / 2 - line.y
      );
      parent.appendChild(line);
    }
  }
}