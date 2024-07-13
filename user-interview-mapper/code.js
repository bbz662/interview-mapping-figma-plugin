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
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        const nodeMap = new Map();
        const page = figma.currentPage;
        const padding = 20; // Padding around nodes
        // Create components
        for (const component of result.components) {
            const node = figma.createFrame();
            node.resize(200 + padding * 2, 100 + padding * 2);
            node.name = component.name;
            node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
            const innerFrame = figma.createFrame();
            innerFrame.resize(200, 100);
            innerFrame.x = padding;
            innerFrame.y = padding;
            innerFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
            node.appendChild(innerFrame);
            const text = figma.createText();
            text.characters = component.description;
            text.fontSize = 12;
            text.x = 10;
            text.y = 10;
            innerFrame.appendChild(text);
            // Position the node in a grid layout
            const index = result.components.indexOf(component);
            const columns = 3;
            node.x = (index % columns) * (250 + padding * 2);
            node.y = Math.floor(index / columns) * (150 + padding * 2);
            nodeMap.set(component.id, node);
            page.appendChild(node);
        }
        // Create connections between components
        for (const component of result.components) {
            const startNode = nodeMap.get(component.id);
            if (!startNode) {
                console.error(`Start node not found for component ${component.id}`);
                continue;
            }
            for (const connection of component.connections) {
                const endNode = nodeMap.get(connection.id);
                if (!endNode) {
                    console.error(`End node not found for connection ${connection.id}`);
                    continue;
                }
                // Create a vector
                const vector = figma.createVector();
                vector.strokeWeight = 2;
                vector.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
                // Determine start and end positions based on relative node positions
                const startCenter = { x: startNode.x + startNode.width / 2, y: startNode.y + startNode.height / 2 };
                const endCenter = { x: endNode.x + endNode.width / 2, y: endNode.y + endNode.height / 2 };
                let startX, startY, endX, endY;
                if (Math.abs(startCenter.x - endCenter.x) > Math.abs(startCenter.y - endCenter.y)) {
                    // Horizontal connection
                    startX = startCenter.x < endCenter.x ? startNode.x + startNode.width : startNode.x;
                    startY = startCenter.y;
                    endX = startCenter.x < endCenter.x ? endNode.x : endNode.x + endNode.width;
                    endY = endCenter.y;
                }
                else {
                    // Vertical connection
                    startX = startCenter.x;
                    startY = startCenter.y < endCenter.y ? startNode.y + startNode.height : startNode.y;
                    endX = endCenter.x;
                    endY = startCenter.y < endCenter.y ? endNode.y : endNode.y + endNode.height;
                }
                // Calculate midpoints for orthogonal routing
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;
                // Create orthogonal path
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
                // Add a label to the vector
                const label = figma.createText();
                label.characters = connection.type;
                label.fontSize = 10;
                // Position the label at the midpoint of the vector
                label.x = midX - label.width / 2;
                label.y = midY - label.height / 2;
                // Group the vector and label
                const group = figma.group([vector, label], page);
                group.name = `Connection: ${component.name} -> ${connection.type}`;
                console.log(`Created connection from ${startNode.name} to ${endNode.name}`);
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
