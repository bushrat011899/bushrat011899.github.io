import { Chart, LinearScale, LineController, PointElement, LineElement, plugins } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(LinearScale, LineController, PointElement, LineElement, plugins.Tooltip, plugins.Colors, plugins.Legend, annotationPlugin);

type PlayerMMRData = {
    name: string,
    data: { x: number, y: number }[]
}

export function mmrChart(players: PlayerMMRData[], date?: number) {
    const chart = document.createElement("canvas");

    const datasets = [];

    for (const player of players) {
        datasets.push({
            label: player.name,
            data: player.data,
            borderWidth: 1
        })
    }

    const scales = {
        y: {
            type: 'linear',
            suggestedMin: 2500,
            suggestedMax: 3000
        },
        x: {
            type: 'linear',
            position: 'bottom',
            ticks: {
                callback: (value: number) => new Date(value).toLocaleString()
            }
        }
    };

    const annotations = {
        star1: {
            type: 'line',
            yMin: 2000,
            yMax: 2000,
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 0.5,
        },
        star2: {
            type: 'line',
            yMin: 2300,
            yMax: 2300,
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 0.5,
        },
        star3: {
            type: 'line',
            yMin: 2600,
            yMax: 2600,
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 0.5,
        },
        star4: {
            type: 'line',
            yMin: 2750,
            yMax: 2750,
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 0.5,
        },
        star5: {
            type: 'line',
            yMin: 3000,
            yMax: 3000,
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 0.5,
        }
    };

    if (date != null) {
        (annotations as any).dateHighlight = {
            type: 'line',
            xMin: date,
            xMax: date,
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 0.5,
        }
    } 

    new Chart(chart, {
        type: 'line',
        data: {
            datasets: datasets as any,
        },
        options: {
            scales: scales as any,
            plugins: {
                annotation: {
                    annotations: annotations as any
                }
            }
        }
    });

    return chart;
}