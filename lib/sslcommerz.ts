// বাংলা: এই module-এ SSLCOMMERZ configuration, hosted checkout ও transaction validation করা হয়।
export type SslCommerzMode = "sandbox" | "live";

export interface SslCommerzConfig {
    mode: SslCommerzMode;
    storeId: string;
    storePassword: string;
    appUrl: URL;
    apiBaseUrl: string;
}

export interface SslCommerzResponse {
    status?: string;
    failedreason?: string;
    GatewayPageURL?: string;
    [key: string]: unknown;
}

// বাংলা: পরিবেশের server-side credential যাচাই করে gateway configuration ফেরত দেয়।
export function getSslCommerzConfig(): SslCommerzConfig {
    const mode = process.env.SSLCOMMERZ_MODE;
    const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const appUrlValue = process.env.APP_URL?.trim();

    if (mode !== "sandbox" && mode !== "live") {
        throw new Error("SSLCOMMERZ_MODE must be set to sandbox or live");
    }

    if (!storeId || !storePassword || !appUrlValue) {
        throw new Error(
            "SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD and APP_URL must be configured",
        );
    }

    let appUrl: URL;
    try {
        appUrl = new URL(appUrlValue);
    } catch {
        throw new Error("APP_URL must be a valid absolute URL");
    }

    const localHttp =
        mode === "sandbox" &&
        appUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(appUrl.hostname);

    if (appUrl.protocol !== "https:" && !localHttp) {
        throw new Error("APP_URL must use HTTPS outside local sandbox development");
    }

    if (appUrl.username || appUrl.password || appUrl.search || appUrl.hash) {
        throw new Error("APP_URL must not contain credentials, query, or fragment");
    }

    appUrl.pathname = `${appUrl.pathname.replace(/\/+$/, "")}/`;

    return {
        mode,
        storeId,
        storePassword,
        appUrl,
        apiBaseUrl:
            mode === "sandbox"
                ? "https://sandbox.sslcommerz.com"
                : "https://securepay.sslcommerz.com",
    };
}

// বাংলা: gateway-তে hosted payment session তৈরির request পাঠায়।
export async function requestSslCommerzSession(
    config: SslCommerzConfig,
    fields: URLSearchParams,
): Promise<SslCommerzResponse> {
    const response = await fetch(
        `${config.apiBaseUrl}/gwprocess/v4/api.php`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: fields,
            cache: "no-store",
            signal: AbortSignal.timeout(15_000),
        },
    );

    const payload = await parseGatewayResponse(response);
    if (!response.ok) {
        throw new Error("SSLCommerz session request failed");
    }

    return payload;
}

// বাংলা: gateway-তে transaction ID, amount ও currency যাচাই করে।
export async function validateSslCommerzTransaction(
    config: SslCommerzConfig,
    validationId: string,
): Promise<SslCommerzResponse> {
    const params = new URLSearchParams({
        val_id: validationId,
        store_id: config.storeId,
        store_passwd: config.storePassword,
        format: "json",
    });

    const response = await fetch(
        `${config.apiBaseUrl}/validator/api/validationserverAPI.php?${params}`,
        {
            method: "GET",
            cache: "no-store",
            signal: AbortSignal.timeout(15_000),
        },
    );

    const payload = await parseGatewayResponse(response);
    if (!response.ok) {
        throw new Error("SSLCommerz validation request failed");
    }

    return payload;
}

// বাংলা: gateway callback-এর জন্য public return URL তৈরি করে।
export function getSslCommerzReturnUrl(
    config: SslCommerzConfig,
    result: "success" | "failed",
) {
    return new URL(
        `member/dashboard/deposits?payment=${result}`,
        config.appUrl,
    );
}

async function parseGatewayResponse(
    response: Response,
): Promise<SslCommerzResponse> {
    let payload: unknown;
    try {
        payload = await response.json();
    } catch {
        throw new Error("SSLCommerz returned an invalid response");
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("SSLCommerz returned an invalid response");
    }

    return payload as SslCommerzResponse;
}
