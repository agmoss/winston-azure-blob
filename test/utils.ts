export const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export const formatYmd = (date: Date) => date.toISOString().slice(0, 10);

export const streamToString = (readableStream: NodeJS.ReadableStream) =>
    // @ts-ignore
    new Promise<string>((resolve, reject) => {
        const chunks: string[] = [];
        if (!readableStream.readable) {
            return reject;
        }
        readableStream.on("data", (data) => {
            chunks.push(data.toString());
        });
        readableStream.on("end", () => {
            return resolve(chunks.join(""));
        });
        readableStream.on("error", () => {
            return reject;
        });
    });
