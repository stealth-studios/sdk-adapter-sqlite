import { drizzle } from "drizzle-orm/libsql";

export default function (url: string, auth?: string) {
    if (!url) {
        throw new Error("Database URL was not passed!");
    }

    const db = drizzle({
        connection: {
            url: url,
            authToken: auth,
        },
    });
    return db;
}
