export type SessionState = 'IDLE' | 'QR_PENDING' | 'QR_SCANNED' | 'LOGGED_IN' | 'QR_EXPIRED';

export interface SessionData {
  userId: string;
  state: SessionState;
  qrTicket: string | null;
  qrUrl: string | null;
  deviceId: string | null;
  /** UID of the currently selected game role */
  selectedGameUid: string | null;
  createdAt: number;
}

export interface MHYDeviceHeaders {
  'x-rpc-app_id': string;
  'x-rpc-client_type': string;
  'x-rpc-device_fp': string;
  'x-rpc-device_id': string;
  'x-rpc-device_model': string;
  'x-rpc-device_name': string;
  'x-rpc-device_os': string;
  'x-rpc-game_biz': string;
  'x-rpc-lifecycle_id': string;
  'x-rpc-sdk_version': string;
}

export interface MHYPassportResponse<T = unknown> {
  retcode: number;
  message: string;
  data: T;
}

export interface QRLoginResponse {
  url: string;
  ticket: string;
}

export interface QRStatusResponse {
  status: 'Created' | 'Scanned' | 'Confirmed';
  app_id: string;
  client_type: number;
  created_at: string;
  scanned_at: string;
  tokens: unknown[];
  user_info: {
    aid: string;
    mid: string;
    account_name: string;
    email: string;
    is_email_verify: number;
    area_code: string;
    mobile: string;
  } | null;
  realname_info: unknown;
  need_realperson: boolean;
  ext: string;
  scan_game_biz: string;
}

/** Error response when QR is expired: retcode=-3501, data=null */
export const QR_EXPIRED_RETCODE = -3501;

export interface LoginRequest {
  userId: string;
}

export interface RenderRequest {
  userId: string;
  dataType: string;
  [key: string]: unknown;
}

export interface LoginStatusResponse {
  userId: string;
  state: SessionState;
  qrUrl?: string | null;
}

export interface HealthStatus {
  redis: 'ok' | 'error';
  upstream: 'ok' | 'error';
  chromium: 'ok' | 'error';
}

// ── Game accounts ──

export interface GameRole {
  game_biz: string;
  region: string;
  game_uid: string;
  nickname: string;
  level: number;
  is_chosen: boolean;
  region_name: string;
  is_official: boolean;
  is_banned: boolean;
  unmask: unknown[];
}

export interface GameRolesResponse {
  list: GameRole[];
}

export interface GameSelectRequest {
  game_biz: string;
  lang: string;
  region: string;
  uid: string;
}

export interface GameSelectResult {
  game: string;
  region: string;
  game_uid: string;
  game_biz: string;
  level: number;
  nickname: string;
  region_name: string;
}

// ── Game records ──

export interface ScoreDetail {
  score: number;
  score_change: number;
  is_quite: boolean;
}

export interface GameRecord {
  nickname: string;
  avatar_url: string;
  timestamp: string;
  result: 'Win' | 'Lose' | 'Draw';
  peak_score: ScoreDetail;
  ladder_score: ScoreDetail;
  is_init_peak_core: boolean;
  trans_no: string;
}

export interface GameRecordsData {
  game_records: GameRecord[];
  refresh_timestamp: string;
}

// ── Home page ──

export interface EntryExperience {
  competition_name: string;
  competition_result: string;
  score: number;
  status: string;
  label: string;
  pc_logo: string;
  mobile_logo: string;
}

export interface RoleInfo {
  card_id: number;
  icon: string;
  proficiency: number;
  name: string;
}

export interface LadderInfo {
  large: number;
  small: number;
}

export interface PageInfo {
  nickname: string;
  honor_labels: unknown[];
  all_score: number;
  rank_score: number;
  rank_num: string;
  entry_experience: EntryExperience[];
  is_shield: boolean;
  avatar_url: string;
  role_infos: RoleInfo[];
  player_level: number;
  last_pass_challenge_time: number;
  ladder_info: LadderInfo;
  ladder_score: number;
  peak_score: number;
  roles: RoleInfo[];
  like_num: number;
  label_v2: unknown[];
  rest_num: number;
  is_init_peak_core: boolean;
}

export interface HomePageData {
  page_info: PageInfo;
  phone: string;
  qq: string;
  is_export_card: boolean;
  default_fill: boolean;
  is_ency_phone: boolean;
  is_ency_qq: boolean;
  code: string;
}

// ── Peak rank ──

export interface PeakRankInfo {
  nickname: string;
  uid: number;
  peak_score: number;
  code: string;
  avatar_url: string;
}

export interface PeakRankData {
  rank_infos: PeakRankInfo[];
  peak_score: number;
  peak_rank_num: string;
  has_next: boolean;
  page_token: string;
  player_level: number;
  last_pass_challenge_time: number;
  nickname: string;
  avatar_url: string;
  refresh_time: string;
}
