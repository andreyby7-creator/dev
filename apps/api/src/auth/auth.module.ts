import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RoleMappingGuard } from './guards/role-mapping.guard';
import { RoleMappingService } from './services/role-mapping.service';
import { AIRoleAnalyzerService } from './services/ai-role-analyzer.service';
import { AIRoleAnalyzerController } from './controllers/ai-role-analyzer.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'fallback-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, AIRoleAnalyzerController],
  providers: [
    AuthService,
    AuthRepository,
    JwtAuthGuard,
    RolesGuard,
    RoleMappingGuard,
    RoleMappingService,
    AIRoleAnalyzerService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    RoleMappingGuard,
    RoleMappingService,
    AIRoleAnalyzerService,
  ],
})
export class AuthModule {}
