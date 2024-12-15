import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

const EnergySankey = ({ selectedYear, countryData }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!countryData || !selectedYear) return;

    const parseCSVData = (data) => {
      const lines = data.split('\n').filter(line => line.trim());
      return lines.slice(1).map(line => {
        const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
        if (!matches) return null;
        return {
          energyBalance: matches[3].replace(/^"|"$/g, '').trim(),
          year: parseInt(matches[7].replace(/^"|"$/g, '').trim()),
          value: parseFloat(matches[8].replace(/^"|"$/g, '').trim())
        };
      }).filter(item => item && item.year === selectedYear);
    };

    const data = parseCSVData(countryData);
    
    const createSankeyData = (data) => {
      const nodes = [
        
        { name: "Net Domestic Production" },
        { name: "Available from all sources" },
        { name: "Imports" },
        { name: "Total Energy System" },
        { name: "Chemical and Petrochemical" },
        { name: "Iron and Steel" },
        { name: "Non-metallic Minerals" },
        { name: "Transport - Rail" },
        { name: "Transport - Road" },
        { name: "Households" },
        { name: "Commercial Services" },
        { name: "Agriculture" },
        { name: "Distribution losses" },
        { name: "Exports" }
      ];

      const getNodeIndex = (name) => nodes.findIndex(n => n.name === name);

      const links = [];
      console.log(data)
      const imports = data.find(d => d.energyBalance === "Imports")?.value || 0;
      const exports = data.find(d => d.energyBalance === "Exports")?.value || 0;
      const losses = data.find(d => d.energyBalance.includes("losses"))?.value || 0;
      console.log(losses,exports,imports)
      const totalSystemOutput = data.find(d => d.energyBalance === "Transformation output")?.value || 0;
      
      const chemical = data.find(d => d.energyBalance.includes("Final consumption - industry sector - chemical and petrochemical"))?.value || 0;
      const steel = data.find(d => d.energyBalance.includes("Final consumption - industry sector - iron and steel"))?.value || 0;
      const minerals = data.find(d => d.energyBalance.includes("Final consumption - industry sector - non-metallic minerals"))?.value || 0;
      const rail = data.find(d => d.energyBalance.includes("Final consumption - transport sector - rail"))?.value || 0;
      const road = data.find(d => d.energyBalance.includes("Final consumption - transport sector - road"))?.value || 0;
      const households = data.find(d => d.energyBalance.includes("Final consumption - other sectors - households"))?.value || 0;
      const commercial = data.find(d => d.energyBalance.includes("Final consumption - other sectors - commercial and public services"))?.value || 0;
      const agriculture = data.find(d => d.energyBalance.includes("Final consumption - other sectors - agriculture"))?.value || 0;
      const domesticProduction = data.find(d => d.energyBalance.includes("Available from all sources"))?.value || 0;
      const Production = exports + totalSystemOutput + chemical + steel + minerals + rail + road + households + commercial + agriculture + losses - imports-domesticProduction;


      links.push(
        { source: getNodeIndex("Available from all sources"), target: getNodeIndex("Total Energy System"), value: Math.max(0, domesticProduction) },
        { source: getNodeIndex("Imports"), target: getNodeIndex("Total Energy System"), value: imports },
        { source: getNodeIndex("Net Domestic Production"), target: getNodeIndex("Total Energy System"), value: Production },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Chemical and Petrochemical"), value: chemical },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Iron and Steel"), value: steel },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Non-metallic Minerals"), value: minerals },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Transport - Rail"), value: rail },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Transport - Road"), value: road },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Households"), value: households },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Commercial Services"), value: commercial },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Agriculture"), value: agriculture },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Distribution losses"), value: losses },
        { source: getNodeIndex("Total Energy System"), target: getNodeIndex("Exports"), value: exports }
      );

      return { nodes, links: links.filter(link => link.value > 0) };
    };

    d3.select(svgRef.current).selectAll("*").remove();

    const width = 1200;
    const height = 800;
    const margin = { top: 20, right: 100, bottom: 20, left: 100 };

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const sankeyGenerator = sankey()
      .nodeWidth(15)
      .nodePadding(20)
      .extent([
        [0, 0],
        [width - margin.left - margin.right, height - margin.top - margin.bottom]
      ]);

    const sankeyData = createSankeyData(data);
    const { nodes, links } = sankeyGenerator(sankeyData);

    // Create color scales for nodes based on their position
    const nodeColorScale = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(nodes.map(d => d.name)); // 使用 D3 内置的分类配色方案
  

    // Create color scale for links based on their value
    const linkColorScale = d3.scaleSequential(d3.interpolatePlasma)
    .domain([0, d3.max(links, d => d.value)]);
  

    const defs = svg.append("defs");
    
    links.forEach((link, i) => {
      const gradientId = `gradient-${i}`;
      const gradient = defs.append("linearGradient")
        .attr("id", gradientId)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", link.source.x1)
        .attr("x2", link.target.x0)
        .attr("y1", link.source.y1)
        .attr("y2", link.target.y0);
    
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", linkColorScale(link.value * 0.8));
    
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", linkColorScale(link.value));
    });
    
    
    svg.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("stroke", (d, i) => `url(#gradient-${i})`) // 使用渐变 ID
      .attr("opacity", 0.8);
    

    // Add nodes with position-based coloring
    const node = svg.append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => Math.max(1, d.y1 - d.y0))
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => nodeColorScale(d.x0))
      .attr("opacity", 0.8);

    // Add node labels
    svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6) // 根据节点位置调整文字方向
    .attr("y", d => (d.y1 + d.y0) / 2) // 垂直居中
    .attr("dy", "0.35em") // 微调基线
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end") // 左右对齐
    .attr("font-size", "12px") // 字体大小
    .attr("font-weight", "500") // 字体加粗程度
    .attr("fill", "black") // 文字颜色为黑色
    .text(d => `${d.name} (${d.value.toFixed(1)} ktoe)`); // 显示文字内容
  
  
    // Add hover effects
    node.on("mouseover", function() {
      d3.select(this).attr("opacity", 1);
    }).on("mouseout", function() {
      d3.select(this).attr("opacity", 0.8);
    });

    // Add tooltips
    node.append("title")
      .text(d => `${d.name}\n${d.value.toFixed(1)} ktoe`);

      node.attr("fill", d => nodeColorScale(d.name))
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5);
  
  }, [countryData, selectedYear]);

  return (
    <div className="chart-container bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4">Power flow Sankey diagram</h3>
      <p className="text-gray-600 mb-4">Demonstrate the complete flow of electricity from production, import to final consumption and export, with colour shades indicating flow size</p>
      <div className="relative aspect-video">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};

export default EnergySankey;