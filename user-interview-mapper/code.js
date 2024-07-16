"use strict";
// code.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Main code
figma.showUI(__html__);
figma.showUI(__html__, { width: 600, height: 600 });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === 'analysis-complete') {
        if (msg.result) {
            try {
                yield renderAnalysisResults(msg.result);
                figma.notify('Analysis rendered successfully!');
            }
            catch (error) {
                console.error('Error rendering analysis results:', error);
                figma.notify('An error occurred while rendering the analysis results.', { error: true });
            }
        }
        else if (msg.error) {
            figma.notify(`Error: ${msg.error}`, { error: true });
        }
    }
    else if (msg.type === 'resize') {
        if (msg.width && msg.height) {
            figma.ui.resize(msg.width, msg.height);
        }
    }
});
function renderAnalysisResults(result) {
    return __awaiter(this, void 0, void 0, function* () {
        const clusterSizes = calculateClusterSizes(result.kaAnalysis.clusters, result.kaAnalysis.kaCards);
        const clusterPositions = calculateClusterPositions(result.kaAnalysis.clusters, result.kaAnalysis.connections, clusterSizes);
        const frameSize = calculateFrameSize(clusterPositions, clusterSizes);
        const frame = figma.createFrame();
        frame.name = 'KA Analysis';
        frame.resize(frameSize.width, frameSize.height);
        yield renderClusters(result.kaAnalysis.clusters, result.kaAnalysis.kaCards, frame, clusterPositions, clusterSizes);
        yield renderRelationshipLabels(result.kaAnalysis.connections, frame, clusterPositions, clusterSizes);
    });
}
function calculateClusterSizes(clusters, kaCards) {
    const sizes = new Map();
    const cardWidth = 180;
    const cardHeight = 100;
    const cardPadding = 10;
    const clusterPadding = 40;
    clusters.forEach(cluster => {
        const clusterCards = kaCards.filter(card => cluster.kaCards.indexOf(card.id) !== -1);
        const cardsPerRow = 2;
        const rows = Math.ceil(clusterCards.length / cardsPerRow);
        const cols = Math.min(clusterCards.length, cardsPerRow);
        const width = cols * cardWidth + (cols + 1) * cardPadding + clusterPadding;
        const height = rows * cardHeight + (rows + 1) * cardPadding + clusterPadding + 30; // Extra 30 for title
        sizes.set(cluster.id, { width, height });
    });
    return sizes;
}
function renderClusters(clusters, kaCards, parent, positions, sizes) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const cluster of clusters) {
            const position = positions.get(cluster.id);
            const size = sizes.get(cluster.id);
            if (!position || !size)
                continue;
            const clusterNode = figma.createFrame();
            clusterNode.name = cluster.name;
            clusterNode.resize(size.width, size.height);
            clusterNode.x = position.x;
            clusterNode.y = position.y;
            clusterNode.cornerRadius = 8;
            clusterNode.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 1 } }];
            const titleText = figma.createText();
            yield figma.loadFontAsync({ family: "Inter", style: "Bold" });
            titleText.fontName = { family: "Inter", style: "Bold" };
            titleText.characters = cluster.name;
            titleText.fontSize = 16;
            titleText.x = 10;
            titleText.y = 10;
            titleText.textAutoResize = 'WIDTH_AND_HEIGHT';
            clusterNode.appendChild(titleText);
            const clusterCards = kaCards.filter(card => cluster.kaCards.indexOf(card.id) !== -1);
            yield renderKACards(clusterCards, clusterNode);
            parent.appendChild(clusterNode);
        }
    });
}
function calculateClusterPositions(clusters, connections, sizes) {
    const positions = new Map();
    const padding = 100;
    // Initialize positions in a grid
    let currentX = padding;
    let currentY = padding;
    let maxHeightInRow = 0;
    clusters.forEach((cluster) => {
        const size = sizes.get(cluster.id);
        if (!size)
            return;
        if (currentX + size.width > 2000) { // Arbitrary max width, adjust as needed
            currentX = padding;
            currentY += maxHeightInRow + padding;
            maxHeightInRow = 0;
        }
        positions.set(cluster.id, { x: currentX, y: currentY });
        currentX += size.width + padding;
        maxHeightInRow = Math.max(maxHeightInRow, size.height);
    });
    // Adjust positions based on connections
    connections.forEach(connection => {
        const fromPos = positions.get(connection.from);
        const toPos = positions.get(connection.to);
        if (fromPos && toPos) {
            const strength = connection.type === 'strong' ? 0.2 : 0.1;
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;
            fromPos.x += (midX - fromPos.x) * strength;
            fromPos.y += (midY - fromPos.y) * strength;
            toPos.x += (midX - toPos.x) * strength;
            toPos.y += (midY - toPos.y) * strength;
        }
    });
    return positions;
}
function calculateFrameSize(positions, sizes) {
    let maxX = 0;
    let maxY = 0;
    positions.forEach((position, clusterId) => {
        const size = sizes.get(clusterId);
        if (size) {
            maxX = Math.max(maxX, position.x + size.width);
            maxY = Math.max(maxY, position.y + size.height);
        }
    });
    return { width: maxX + 100, height: maxY + 100 }; // Add some padding
}
function renderRelationshipLabels(connections, parent, positions, sizes) {
    return __awaiter(this, void 0, void 0, function* () {
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
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
    });
}
// Keep the renderKACards function as it was before, but make sure it's using the correct positioning
function renderKACards(cards, parent) {
    return __awaiter(this, void 0, void 0, function* () {
        const cardWidth = 180;
        const cardHeight = 100;
        const cardPadding = 10;
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        cards.forEach((card, index) => {
            const x = cardPadding + (index % 2) * (cardWidth + cardPadding);
            const y = 40 + Math.floor(index / 2) * (cardHeight + cardPadding);
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
        });
    });
}
