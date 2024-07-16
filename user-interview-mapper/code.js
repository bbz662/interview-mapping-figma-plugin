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
        const frame = figma.createFrame();
        frame.name = 'KA Analysis';
        frame.resize(2000, 1600);
        const clusterPositions = calculateClusterPositions(result.kaAnalysis.clusters, result.kaAnalysis.connections);
        yield renderClusters(result.kaAnalysis.clusters, result.kaAnalysis.kaCards, frame, clusterPositions);
        yield renderRelationshipLabels(result.kaAnalysis.connections, frame, clusterPositions);
    });
}
function calculateClusterPositions(clusters, connections) {
    const positions = new Map();
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
function renderClusters(clusters, kaCards, parent, positions) {
    return __awaiter(this, void 0, void 0, function* () {
        const clusterSize = 400;
        for (const cluster of clusters) {
            const position = positions.get(cluster.id);
            if (!position)
                continue;
            const clusterNode = figma.createFrame();
            clusterNode.name = cluster.name;
            clusterNode.resize(clusterSize, clusterSize);
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
            const clusterCards = kaCards.filter(card => cluster.kaCards.some(kaCardId => kaCardId === card.id));
            yield renderKACards(clusterCards, clusterNode);
            parent.appendChild(clusterNode);
        }
    });
}
function renderRelationshipLabels(connections, parent, positions) {
    return __awaiter(this, void 0, void 0, function* () {
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
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
    });
}
function renderKACards(cards, parent) {
    return __awaiter(this, void 0, void 0, function* () {
        const cardWidth = 180;
        const cardHeight = 100;
        const cardPadding = 10;
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
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
    });
}
