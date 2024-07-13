"use strict";
// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 500, height: 500 });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === 'analysis-complete') {
        if (msg.result) {
            yield renderAnalysisResults(msg.result);
            figma.closePlugin();
        }
        else if (msg.error) {
            figma.notify(`Error: ${msg.error}`, { error: true });
        }
    }
});
function renderAnalysisResults(result) {
    return __awaiter(this, void 0, void 0, function* () {
        // Load a font to use for text
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        const nodeMap = new Map();
        const page = figma.currentPage;
        const connections = [];
        // Create components
        result.components.forEach((component, index) => {
            const node = figma.createComponent();
            node.resize(200, 100);
            node.name = component.name;
            const text = figma.createText();
            text.characters = component.description;
            text.fontSize = 12;
            text.x = 10;
            text.y = 10;
            node.appendChild(text);
            // Position the node in a grid layout
            const columns = 3;
            node.x = (index % columns) * 250;
            node.y = Math.floor(index / columns) * 150;
            // Store the node reference
            nodeMap.set(component.id, node);
            page.appendChild(node);
        });
        // Create connections between components
        result.components.forEach(component => {
            const startNode = nodeMap.get(component.id);
            if (!startNode)
                return;
            component.connections.forEach(connection => {
                const endNode = nodeMap.get(connection.id);
                if (!endNode)
                    return;
                const line = figma.createLine();
                line.strokeWeight = 2;
                line.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
                // Set line endpoints
                const startX = startNode.x + startNode.width / 2;
                const startY = startNode.y + startNode.height / 2;
                const endX = endNode.x + endNode.width / 2;
                const endY = endNode.y + endNode.height / 2;
                line.x = startX;
                line.y = startY;
                line.resize(endX - startX, endY - startY);
                // Add a label to the line
                const label = figma.createText();
                label.characters = connection.type;
                label.fontSize = 10;
                label.x = (startX + endX) / 2;
                label.y = (startY + endY) / 2;
                // Group the line and label
                const group = figma.group([line, label], page);
                group.name = `Connection: ${component.name} -> ${connection.type}`;
                // Add to connections array
                connections.push(group);
            });
        });
        // Reorder elements to ensure connections are behind components
        const allNodes = page.children;
        connections.forEach(connection => {
            const index = allNodes.indexOf(connection);
            if (index !== -1) {
                page.insertChild(0, connection);
            }
        });
        // Adjust the view to fit all created nodes
        figma.viewport.scrollAndZoomIntoView(page.children);
    });
}
