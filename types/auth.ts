export interface MemberData {
    id: number;
    nama_member: string;
    instansi: string;
    alamat: string;
    telp: string;
    foto?: string;
}

export interface SpaceOwnerData {
    id: number;
    nama_coworking: string;
    nama_pemilik: string;
    telp: string;
}

export interface UserProfile {
    id: number;
    username: string;
    role: 'member' | 'admin_space';
    member?: MemberData | null;
    space_owner?: SpaceOwnerData | null;
}

export interface ApiResponse<T> {
    status: boolean;
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
}

export interface AuthResponseData {
    id: number;
    username: string;
    role: 'member' | 'admin_space';
    access_token: string;
    member?: MemberData | null;
    space_owner?: SpaceOwnerData | null;
}