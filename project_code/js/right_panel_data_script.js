document.addEventListener('DOMContentLoaded', async function () {
    // 获取容器并设置基础配置
    let currentYear = dataLoader.getSelectedYear();

    // 创建更新函数
    async function updateRightPanel() {
        // 获取当前选中的年份
        const selectedYear = dataLoader.getSelectedYear();
        console.log(selectedYear);
        
        // 检查年份是否发生变化
        if (currentYear !== selectedYear) {
            currentYear = selectedYear; // 更新当前年份
        }
        
        // 清空现有内容以避免图表覆盖
        d3.select("#bubble-chart-container").selectAll("*").remove();
        d3.select("#bar-chart-container").selectAll("*").remove();

        // 使用 window.createAndAddBubbleChart 添加气泡图
        if (typeof window.createAndAddBubbleChart === 'function') {
            await window.createAndAddBubbleChart("#bubble-chart-container", '../data/ALLdata.csv', currentYear);
        } else {
            console.error("createAndAddBubbleChart function is not defined. Make sure right_bubblechart.js is properly loaded.");
        }

        // 使用 window.createAndAddBarChart 添加柱状图
        if (typeof window.createAndAddBarChart === 'function') {
            await window.createAndAddBarChart("#bar-chart-container", '../data/ALLdata.csv', currentYear);
        } else {
            console.error("createAndAddBarChart function is not defined. Make sure right_barchart.js is properly loaded.");
        }
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
