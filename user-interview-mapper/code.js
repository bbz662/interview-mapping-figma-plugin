"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Main plugin code
figma.showUI(__html__, { width: 500, height: 500 });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === 'analysis-complete') {
        if (msg.result) {
            try {
                yield renderAnalysisResults(msg.result);
                figma.closePlugin();
            }
            catch (error) {
                console.error('Error rendering analysis results:', error);
            }
        }
        else if (msg.error) {
            figma.notify(`Error: ${msg.error}`, { error: true });
        }
    }
});
function renderAnalysisResults(result) {
    return __awaiter(this, void 0, void 0, function* () {
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        const nodeMap = new Map();
        const page = figma.currentPage;
        const padding = 20;
        const nodeWidth = 200 + padding * 2;
        const nodeHeight = 100 + padding * 2;
        // Process KACards
        if (result.kaCards && result.kaCards.length > 0) {
            for (const kaCard of result.kaCards) {
                const position = {
                    x: Math.random() * figma.viewport.bounds.width,
                    y: Math.random() * figma.viewport.bounds.height
                };
                nodeMap.set(kaCard.id, { position });
            }
        }
        // Process Clusters
        if (result.clusters && result.clusters.length > 0) {
            for (const cluster of result.clusters) {
                const position = {
                    x: Math.random() * figma.viewport.bounds.width,
                    y: Math.random() * figma.viewport.bounds.height
                };
                nodeMap.set(cluster.id, { position });
            }
        }
        // Apply force-directed layout
        const iterations = 50;
        const k = 300; // Spring constant
        for (let i = 0; i < iterations; i++) {
            for (const nodeInfo of nodeMap.values()) {
                let fx = 0, fy = 0;
                // Repulsive force from other nodes
                for (const otherNodeInfo of nodeMap.values()) {
                    if (otherNodeInfo !== nodeInfo) {
                        const dx = nodeInfo.position.x - otherNodeInfo.position.x;
                        const dy = nodeInfo.position.y - otherNodeInfo.position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance > 0) {
                            const force = k * k / distance;
                            fx += force * dx / distance;
                            fy += force * dy / distance;
                        }
                    }
                }
                // Update position
                nodeInfo.position.x += fx * 0.1;
                nodeInfo.position.y += fy * 0.1;
            }
        }
        // Create nodes for KACards
        if (result.kaCards && result.kaCards.length > 0) {
            for (const kaCard of result.kaCards) {
                const nodeInfo = nodeMap.get(kaCard.id);
                if (!nodeInfo)
                    continue;
                const node = figma.createFrame();
                node.resize(nodeWidth, nodeHeight);
                node.name = `KACard: ${kaCard.event}`;
                node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 1 } }];
                const innerFrame = figma.createFrame();
                innerFrame.resize(200, 100);
                innerFrame.x = padding;
                innerFrame.y = padding;
                innerFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                node.appendChild(innerFrame);
                const text = figma.createText();
                text.characters = `Event: ${kaCard.event}\nInner Voice: ${kaCard.innerVoice}\nValue: ${kaCard.value}`;
                text.fontSize = 10;
                text.x = 10;
                text.y = 10;
                innerFrame.appendChild(text);
                node.x = nodeInfo.position.x;
                node.y = nodeInfo.position.y;
                nodeInfo.node = node;
                page.appendChild(node);
            }
        }
        // Create nodes for clusters
        if (result.clusters && result.clusters.length > 0) {
            for (const cluster of result.clusters) {
                const nodeInfo = nodeMap.get(cluster.id);
                if (!nodeInfo)
                    continue;
                const node = figma.createFrame();
                node.resize(nodeWidth, nodeHeight);
                node.name = cluster.name;
                node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 1, b: 0.9 } }];
                const innerFrame = figma.createFrame();
                innerFrame.resize(200, 100);
                innerFrame.x = padding;
                innerFrame.y = padding;
                innerFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
                node.appendChild(innerFrame);
                const text = figma.createText();
                text.characters = `${cluster.name}\n${cluster.representingValue}\nKACards: ${cluster.kaCards.length}`;
                text.fontSize = 12;
                text.x = 10;
                text.y = 10;
                innerFrame.appendChild(text);
                node.x = nodeInfo.position.x;
                node.y = nodeInfo.position.y;
                nodeInfo.node = node;
                page.appendChild(node);
            }
        }
        // Create connections
        if (result.connections && result.connections.length > 0) {
            for (const connection of result.connections) {
                const startNodeInfo = nodeMap.get(connection.from);
                const endNodeInfo = nodeMap.get(connection.to);
                if (!(startNodeInfo === null || startNodeInfo === void 0 ? void 0 : startNodeInfo.node) || !(endNodeInfo === null || endNodeInfo === void 0 ? void 0 : endNodeInfo.node))
                    continue;
                const vector = figma.createVector();
                vector.strokeWeight = 2;
                vector.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
                const startNode = startNodeInfo.node;
                const endNode = endNodeInfo.node;
                const startCenter = { x: startNode.x + startNode.width / 2, y: startNode.y + startNode.height / 2 };
                const endCenter = { x: endNode.x + endNode.width / 2, y: endNode.y + endNode.height / 2 };
                let startX, startY, endX, endY;
                if (Math.abs(startCenter.x - endCenter.x) > Math.abs(startCenter.y - endCenter.y)) {
                    startX = startCenter.x < endCenter.x ? startNode.x + startNode.width : startNode.x;
                    startY = startCenter.y;
                    endX = startCenter.x < endCenter.x ? endNode.x : endNode.x + endNode.width;
                    endY = endCenter.y;
                }
                else {
                    startX = startCenter.x;
                    startY = startCenter.y < endCenter.y ? startNode.y + startNode.height : startNode.y;
                    endX = endCenter.x;
                    endY = startCenter.y < endCenter.y ? endNode.y : endNode.y + endNode.height;
                }
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;
                yield vector.setVectorNetworkAsync({
                    vertices: [
                        { x: startX, y: startY },
                        { x: midX, y: startY },
                        { x: midX, y: endY },
                        { x: endX, y: endY }
                    ],
                    segments: [
                        { start: 0, end: 1 },
                        { start: 1, end: 2 },
                        { start: 2, end: 3 }
                    ]
                });
                const label = figma.createText();
                label.characters = `${connection.type}\n${connection.description || ''}`;
                label.fontSize = 10;
                label.x = midX - label.width / 2;
                label.y = midY - label.height / 2;
                const group = figma.group([vector, label], page);
                group.name = `Connection: ${connection.from} -> ${connection.to}`;
            }
        }
        // Move all connection groups to the back
        const connections = page.findChildren(n => n.type === 'GROUP' && n.name.startsWith('Connection:'));
        connections.forEach(connection => {
            page.insertChild(0, connection);
        });
        // Adjust the view to fit all created nodes
        figma.viewport.scrollAndZoomIntoView(page.children);
    });
}
