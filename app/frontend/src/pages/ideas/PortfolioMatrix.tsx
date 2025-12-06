/**
 * Portfolio Matrix Component
 *
 * Interactive scatter plot visualization showing ideas plotted by
 * Impact (Y-axis) vs Feasibility (X-axis). Color-coded by recommendation class.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Idea, RecommendationClass } from "../../api/models";
import styles from "./PortfolioMatrix.module.css";

interface PortfolioMatrixProps {
    ideas: Idea[];
    onIdeaClick: (idea: Idea) => void;
}

interface PlottedIdea {
    idea: Idea;
    x: number;
    y: number;
    color: string;
}

// Color mapping for recommendation classes
const RECOMMENDATION_COLORS: Record<string, string> = {
    [RecommendationClass.QuickWin]: "#4CAF50",
    [RecommendationClass.HighLeverage]: "#DCFF4A",
    [RecommendationClass.Strategic]: "#2196F3",
    [RecommendationClass.Evaluate]: "#9E9E9E",
    [RecommendationClass.Unclassified]: "#BDBDBD",
};

/**
 * Portfolio Matrix component for visualizing ideas on an Impact vs Feasibility grid.
 */
export function PortfolioMatrix({ ideas, onIdeaClick }: PortfolioMatrixProps): JSX.Element {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
    const [hoveredIdea, setHoveredIdea] = useState<Idea | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    // Padding for axes
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: Math.max(400, rect.width),
                    height: Math.max(300, rect.height),
                });
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // Calculate plotted positions for each idea
    // Only show ideas that have been reviewed by LLM (have review scores)
    const plottedIdeas = useMemo((): PlottedIdea[] => {
        const chartWidth = dimensions.width - padding.left - padding.right;
        const chartHeight = dimensions.height - padding.top - padding.bottom;

        return ideas
            .filter(idea => {
                // Only include ideas that have been reviewed (have reviewedAt timestamp)
                const hasBeenReviewed = idea.reviewedAt !== undefined && idea.reviewedAt > 0;
                return hasBeenReviewed &&
                    idea.reviewImpactScore !== undefined &&
                    idea.reviewFeasibilityScore !== undefined;
            })
            .map(idea => ({
                idea,
                x: padding.left + (idea.reviewFeasibilityScore! / 100) * chartWidth,
                y: padding.top + chartHeight - (idea.reviewImpactScore! / 100) * chartHeight,
                color: RECOMMENDATION_COLORS[idea.reviewRecommendationClass || RecommendationClass.Unclassified],
            }));
    }, [ideas, dimensions, padding]);

    // Handle mouse move for tooltip
    const handleMouseMove = useCallback((e: React.MouseEvent, idea: Idea) => {
        setHoveredIdea(idea);
        setTooltipPosition({ x: e.clientX, y: e.clientY });
    }, []);

    // Handle mouse leave
    const handleMouseLeave = useCallback(() => {
        setHoveredIdea(null);
    }, []);

    // Render grid lines
    const renderGridLines = () => {
        const chartWidth = dimensions.width - padding.left - padding.right;
        const chartHeight = dimensions.height - padding.top - padding.bottom;
        const lines: JSX.Element[] = [];

        // Horizontal grid lines (Impact levels)
        for (let i = 0; i <= 10; i++) {
            const y = padding.top + (chartHeight / 10) * i;
            lines.push(
                <line
                    key={`h-${i}`}
                    x1={padding.left}
                    y1={y}
                    x2={dimensions.width - padding.right}
                    y2={y}
                    className={i === 3 || i === 7 ? styles.gridLineMajor : styles.gridLine}
                />
            );
        }

        // Vertical grid lines (Feasibility levels)
        for (let i = 0; i <= 10; i++) {
            const x = padding.left + (chartWidth / 10) * i;
            lines.push(
                <line
                    key={`v-${i}`}
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={dimensions.height - padding.bottom}
                    className={i === 3 || i === 7 ? styles.gridLineMajor : styles.gridLine}
                />
            );
        }

        return lines;
    };

    // Render quadrant labels
    const renderQuadrantLabels = () => {
        const chartWidth = dimensions.width - padding.left - padding.right;
        const chartHeight = dimensions.height - padding.top - padding.bottom;

        return (
            <>
                {/* High Impact, Low Feasibility - Strategic */}
                <text
                    x={padding.left + chartWidth * 0.15}
                    y={padding.top + chartHeight * 0.15}
                    className={styles.quadrantLabel}
                >
                    {t("ideas.matrix.strategic")}
                </text>
                {/* High Impact, High Feasibility - High Leverage */}
                <text
                    x={padding.left + chartWidth * 0.85}
                    y={padding.top + chartHeight * 0.15}
                    className={styles.quadrantLabel}
                >
                    {t("ideas.matrix.highLeverage")}
                </text>
                {/* Low Impact, Low Feasibility - Evaluate */}
                <text
                    x={padding.left + chartWidth * 0.15}
                    y={padding.top + chartHeight * 0.85}
                    className={styles.quadrantLabel}
                >
                    {t("ideas.matrix.evaluate")}
                </text>
                {/* Low Impact, High Feasibility - Quick Win */}
                <text
                    x={padding.left + chartWidth * 0.85}
                    y={padding.top + chartHeight * 0.85}
                    className={styles.quadrantLabel}
                >
                    {t("ideas.matrix.quickWin")}
                </text>
            </>
        );
    };

    // Render axis labels
    const renderAxisLabels = () => {
        const chartWidth = dimensions.width - padding.left - padding.right;
        const chartHeight = dimensions.height - padding.top - padding.bottom;

        return (
            <>
                {/* X-axis label */}
                <text
                    x={padding.left + chartWidth / 2}
                    y={dimensions.height - 10}
                    className={styles.axisLabel}
                >
                    {t("ideas.matrix.feasibility")}
                </text>
                {/* Y-axis label */}
                <text
                    x={15}
                    y={padding.top + chartHeight / 2}
                    className={styles.axisLabel}
                    transform={`rotate(-90, 15, ${padding.top + chartHeight / 2})`}
                >
                    {t("ideas.matrix.impact")}
                </text>
                {/* Axis tick labels */}
                <text x={padding.left} y={dimensions.height - padding.bottom + 20} className={styles.tickLabel}>0</text>
                <text x={padding.left + chartWidth / 2} y={dimensions.height - padding.bottom + 20} className={styles.tickLabel}>50</text>
                <text x={dimensions.width - padding.right} y={dimensions.height - padding.bottom + 20} className={styles.tickLabel}>100</text>
                <text x={padding.left - 25} y={dimensions.height - padding.bottom} className={styles.tickLabel}>0</text>
                <text x={padding.left - 25} y={padding.top + chartHeight / 2} className={styles.tickLabel}>50</text>
                <text x={padding.left - 30} y={padding.top} className={styles.tickLabel}>100</text>
            </>
        );
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.header}>
                <h3 className={styles.title}>{t("ideas.matrix.title")}</h3>
                <div className={styles.legend}>
                    {Object.entries(RECOMMENDATION_COLORS).slice(0, 4).map(([key, color]) => (
                        <div key={key} className={styles.legendItem}>
                            <span className={styles.legendDot} style={{ backgroundColor: color }} />
                            <span className={styles.legendLabel}>{t(`ideas.recommendation.${key}`)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <svg
                width={dimensions.width}
                height={dimensions.height}
                className={styles.chart}
            >
                {/* Grid lines */}
                {renderGridLines()}

                {/* Quadrant labels */}
                {renderQuadrantLabels()}

                {/* Axis labels */}
                {renderAxisLabels()}

                {/* Data points */}
                {plottedIdeas.map(({ idea, x, y, color }) => (
                    <circle
                        key={idea.ideaId}
                        cx={x}
                        cy={y}
                        r={8}
                        fill={color}
                        stroke="#000"
                        strokeWidth={hoveredIdea?.ideaId === idea.ideaId ? 3 : 1}
                        className={styles.dataPoint}
                        onClick={() => onIdeaClick(idea)}
                        onMouseMove={(e) => handleMouseMove(e, idea)}
                        onMouseLeave={handleMouseLeave}
                    />
                ))}
            </svg>

            {/* Tooltip */}
            {hoveredIdea && (
                <div
                    className={styles.tooltip}
                    style={{
                        left: tooltipPosition.x + 10,
                        top: tooltipPosition.y + 10,
                    }}
                >
                    <div className={styles.tooltipTitle}>{hoveredIdea.title}</div>
                    <div className={styles.tooltipScore}>
                        {t("ideas.impact")}: {hoveredIdea.reviewImpactScore}
                    </div>
                    <div className={styles.tooltipScore}>
                        {t("ideas.feasibility")}: {hoveredIdea.reviewFeasibilityScore}
                    </div>
                    <div className={styles.tooltipHint}>{t("ideas.matrix.clickToView")}</div>
                </div>
            )}

            {/* Empty state */}
            {plottedIdeas.length === 0 && (
                <div className={styles.emptyState}>
                    <p>{t("ideas.matrix.noData")}</p>
                </div>
            )}
        </div>
    );
}

export default PortfolioMatrix;

