export interface LoginResponse {
    user: {
        id: string;
        email: string;
        username: string;
        name: string;
    };

    accessToken: string;
    refreshToken: string;
}
