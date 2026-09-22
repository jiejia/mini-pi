let promise = new Promise<string>(function(resolve, reject) {
    let success = false;

    setTimeout(function() {
        if (success) {
            resolve("成功!");
        } else {
            reject(new Error("失败"));
        }
    }, 2000);
});

async function main() {
    try {
        const value = await promise;

        console.log("完成: " + value);
    } catch (error) {
        console.log("错误: " + (error as Error).message);
    }
}

main();

console.log("等待中...");