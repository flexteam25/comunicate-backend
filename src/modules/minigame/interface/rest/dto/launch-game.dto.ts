import { IsString, IsOptional, IsIn } from 'class-validator';

const GAME_TYPES = ['slot', 'dice', 'crash', 'mines', 'plinko', 'scissors', 'turtlerace'] as const;

export class LaunchGameDto {
  @IsString()
  @IsIn(GAME_TYPES)
  gameType: (typeof GAME_TYPES)[number];

  @IsOptional()
  @IsString()
  redirectUrl?: string;
}
