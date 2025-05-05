const CustomTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: any[];
    label?: string;
}) => {
    if (active && payload && payload.length) {
        const date = new Date(label!).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

        return (
            <div className="bg-white dark:bg-gray-800 text-black dark:text-white p-2 rounded shadow">
                <p className="font-bold">{date}</p>
                {payload.map((entry: any, index: number) => (
                    <p
                        key={index}
                        className="text-sm"
                        style={{ color: entry.stroke }}
                    >
                        {entry.name}: {Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(1)}
                    </p>
                ))}
            </div>
        );
    }

    return null;
};

export default CustomTooltip;