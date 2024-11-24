document.addEventListener('DOMContentLoaded', async function () {
    // 获取容器并设置基础配置
    const container = d3.select("#right-panel");
    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    
    // 初始化数据
    const { csvData, europeanCountryNames } = await dataLoader.processData();
    let currentYear = dataLoader.getSelectedYear();

    // 创建更新函数
    function updateRightPanel() {
        // 获取当前选中的年份
        const selectedYear = dataLoader.getSelectedYear();
        console.log(selectedYear)
        // 检查年份是否发生变化
        if (currentYear !== selectedYear) {
            currentYear = selectedYear; // 更新当前年份
        }
        
        // 获取当前选中的字段
        const selectedField = dataLoader.getSelectedField() || "Gross_electricity_production";
        
        // 获取筛选后的数据
        const { countryMap, values } = dataLoader.filterDataByYearAndField(
            csvData,
            currentYear,
            selectedField,
            europeanCountryNames
        );

        // 计算容器尺寸
        const width = parseInt(container.style("width")) - margin.left - margin.right;
        const height = parseInt(container.style("height")) - margin.top - margin.bottom;

        // 清空现有内容
        container.selectAll("*").remove();

        // 创建新的SVG
        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // 添加年份显示，使用transition实现平滑更新
        const yearText = svg.append("text")
            .attr("class", "year-display")
            .attr("x", width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold");

        // 使用过渡动画更新年份显示
        yearText.transition()
            .duration(300)
            .text(`Selected Year: ${currentYear}`);

        // 这里添加你的其他可视化代码
    }

    // 初始化图表
    updateRightPanel();
    
    // 使用事件委托来监听年份变化
    document.addEventListener('change', function(e) {
        if (e.target.matches('input[name="yearRadio"]')) {
            updateRightPanel();
        }
    });

    // 监听字段选择按钮的点击事件
    document.addEventListener('click', function(e) {
        if (e.target.matches('.button-container button')) {
            updateRightPanel();
        }
    });

    // 监听窗口大小变化
    window.addEventListener("resize", () => {
        requestAnimationFrame(updateRightPanel);
    });

    // 将更新函数绑定到全局对象
    window.updateRightPanel = updateRightPanel;
});