import type { Chart } from "chart.js";

/**
 * Lazy-loads Chart.js components one first request, and then provides a cached instance of `Chart` from then on.
 * @returns Chart.js `Chart` object.
 */
export async function getChart(): Promise<typeof Chart> {
    if (c == null) {
        const { Chart, LinearScale, LineController, PointElement, LineElement, plugins } = await import(/* webpackPrefetch: true */ 'chart.js');
        const annotationPlugin = await import(/* webpackPrefetch: true */ 'chartjs-plugin-annotation');
        
        Chart.register(LinearScale, LineController, PointElement, LineElement, plugins.Tooltip, plugins.Colors, plugins.Legend, annotationPlugin);

        c = Chart;
    }

    return c;
}

let c: typeof Chart = null;