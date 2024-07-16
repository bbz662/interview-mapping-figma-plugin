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
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === 'analysis-complete') {
        if (msg.result) {
            try {
                yield renderAnalysisResults(msg.result);
                figma.closePlugin();
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
});
function renderAnalysisResults(result) {
    return __awaiter(this, void 0, void 0, function* () {
        const frame = figma.createFrame();
        frame.name = 'KA Analysis';
        frame.resize(1000, 800);
        yield renderClusters(result.kaAnalysis.clusters, frame);
        yield renderConnections(result.kaAnalysis.connections, frame);
    });
}
function renderClusters(clusters, parent) {
    return __awaiter(this, void 0, void 0, function* () {
        const clusterSize = 150;
        const padding = 20;
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
            const text = figma.createText();
            yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
            text.characters = cluster.name;
            text.fontSize = 12;
            text.x = 10;
            text.y = 10;
            text.textAutoResize = 'HEIGHT';
            text.resize(clusterSize - 20, 20);
            clusterNode.appendChild(text);
            parent.appendChild(clusterNode);
        }
    });
}
function renderConnections(connections, parent) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const connection of connections) {
            const fromNode = parent.findChild(n => n.name === connection.from);
            const toNode = parent.findChild(n => n.name === connection.to);
            if (fromNode && toNode) {
                const line = figma.createLine();
                line.x = fromNode.x + fromNode.width / 2;
                line.y = fromNode.y + fromNode.height / 2;
                line.strokeWeight = connection.type === 'strong' ? 2 : 1;
                line.strokeCap = 'ROUND';
                line.strokeJoin = 'ROUND';
                line.resize(toNode.x + toNode.width / 2 - line.x, toNode.y + toNode.height / 2 - line.y);
                parent.appendChild(line);
            }
        }
    });
}
