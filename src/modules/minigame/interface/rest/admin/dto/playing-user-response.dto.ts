export interface PlayingUserDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
}

export interface PlayingUserItemDto {
  user: PlayingUserDto;
  gameType: string;
}
