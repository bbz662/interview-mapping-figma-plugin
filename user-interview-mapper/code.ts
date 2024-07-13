// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

interface AnalysisResult {
  components: Component[];
}

interface Component {
  id: string;
  name: string;
  description: string;
  connections: Connection[];
}

interface Connection {
  id: string;
  type: string;
}

figma.showUI(__html__);

figma.ui.onmessage = async (msg: { type: string; result: AnalysisResult }) => {
  if (msg.type === 'analysis-complete') {
    await renderAnalysisResults(msg.result);
    figma.closePlugin();
  }
};

async function renderAnalysisResults(result: AnalysisResult): Promise<void> {
  // Load a font to use for text
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

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

      const startNode = figma.root.findOne(node => node.getRelaunchData().id === component.id) as ComponentNode;
      const endNode = figma.root.findOne(node => node.getRelaunchData().id === connection.id) as ComponentNode;

      if (startNode && endNode) {
        line.x = startNode.x + startNode.width / 2;
        line.y = startNode.y + startNode.height / 2;
        line.resize(endNode.x - line.x + endNode.width / 2, endNode.y - line.y + endNode.height / 2);
      }
    });
  });
}
