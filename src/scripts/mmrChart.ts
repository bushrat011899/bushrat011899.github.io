import { getChart } from './chartLibrary';

const MMR_THRESHOLD = [
    2000,
    2300,
    2600,
    2750,
    3000
];

type PlayerMMRData = {
    name: string,
    data: { x: number, y: number }[]
}

export async function mmrChart(players: PlayerMMRData[], date?: number) {
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
            suggestedMax: 3000,
            grid: {
                color: "#888",
            },
        },
        x: {
            type: 'linear',
            position: 'bottom',
            grid: {
                color: "#888",
            },
            ticks: {
                callback: (value: number) => new Date(value).toLocaleString()
            }
        }
    };

    const annotations: any = {};

    for (const [index, threshold] of MMR_THRESHOLD.entries()) {
        annotations[`star${index}`] = {
            type: 'line',
            yMin: threshold,
            yMax: threshold,
            borderColor: '#888',
            borderWidth: 0.5,
        }
    }

    if (date != null) {
        (annotations as any).dateHighlight = {
            type: 'line',
            xMin: date,
            xMax: date,
            borderColor: '#888',
            borderWidth: 0.5,
        }
    } 

    const Chart = await getChart();

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