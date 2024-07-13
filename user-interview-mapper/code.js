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
figma.showUI(__html__);
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === 'analysis-complete') {
        yield renderAnalysisResults(msg.result);
        figma.closePlugin();
    }
});
function renderAnalysisResults(result) {
    return __awaiter(this, void 0, void 0, function* () {
        // Load a font to use for text
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        result.components.forEach(component => {
            const node = figma.createComponent();
            node.resize(200, 100);
            node.name = component.name;
            const text = figma.createText();
            text.characters = component.description;
            text.fontSize = 12;
            text.x = 10;
            text.y = 10;
            node.appendChild(text);
            // Position the node
            node.x = Math.random() * figma.viewport.bounds.width;
            node.y = Math.random() * figma.viewport.bounds.height;
            // Store the component id in the node's name
            node.setRelaunchData({ id: component.id });
        });
        // Create connections between components
        result.components.forEach(component => {
            component.connections.forEach(connection => {
                const line = figma.createLine();
                line.strokeWeight = 2;
                line.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
                const startNode = figma.root.findOne(node => node.getRelaunchData().id === component.id);
                const endNode = figma.root.findOne(node => node.getRelaunchData().id === connection.id);
                if (startNode && endNode) {
                    line.x = startNode.x + startNode.width / 2;
                    line.y = startNode.y + startNode.height / 2;
                    line.resize(endNode.x - line.x + endNode.width / 2, endNode.y - line.y + endNode.height / 2);
                }
            });
        });
    });
}
