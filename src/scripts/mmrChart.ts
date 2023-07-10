import { Chart, LinearScale, LineController, PointElement, LineElement, plugins } from 'chart.js';

Chart.register(LinearScale, LineController, PointElement, LineElement, plugins.Tooltip, plugins.Colors, plugins.Legend);

type PlayerMMRData = {
    name: string,
    data: { x: number, y: number }[]
}

export function mmrChart(players: PlayerMMRData[]) {
    const chart = document.createElement("canvas");

    const datasets = [];

    for (const player of players) {
        datasets.push({
            label: player.name,
            data: player.data,
            borderWidth: 1
        })
    }

    new Chart(chart, {
        type: 'line',
        data: {
            datasets: datasets as any,
        },
        options: {
            scales: {
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
            }
        }
    });

    return chart;
}