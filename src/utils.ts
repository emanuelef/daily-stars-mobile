// Function to calculate a running average
export function calculateRunningAverage(
    data: { date: string; daily: number; cumulative: number }[],
    windowSize: number
) {
    return data.map((_, index, array) => {
        const start = Math.max(0, index - windowSize + 1);
        const subset = array.slice(start, index + 1);
        const averageDaily = subset.reduce((sum, item) => sum + item.daily, 0) / subset.length;
        return {
            ...array[index],
            daily: averageDaily, // Replace daily with the smoothed value
        };
    });
}

// Function to calculate percentiles
export function calculatePercentiles(data: number[], ...percentiles: number[]) {
    const sorted = [...data].sort((a, b) => a - b);
    return percentiles.map((percentile) => {
        const index = Math.ceil(percentile * sorted.length) - 1;
        return sorted[index];
    });
}

// Function to strip trailing slash from a string
export const stripTrailingSlash = (str: string) =>
    str.charAt(str.length - 1) === "/" ? str.substr(0, str.length - 1) : str;

// Function to parse a GitHub repository URL
export const parseGitHubRepoURL = (url: string) => {
    url = url.replace(/ /g, "");
    url = url.toLowerCase();
    url = stripTrailingSlash(url);
    // Define the regular expression pattern to match GitHub repository URLs
    const repoURLPattern =
        /^(?:https?:\/\/github\.com\/)?(?:\/)?([^/]+)\/([^/]+)(?:\/.*)?$/;

    // Use RegExp.exec to match the pattern against the URL
    const match = repoURLPattern.exec(url);

    if (match && match.length === 3) {
        const owner = match[1];
        const repoName = match[2];
        return `${owner}/${repoName}`;
    } else {
        return null; // Invalid URL
    }
};