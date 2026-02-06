import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    // Check regular users
    const user = await this.db.queryOne<any>(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1 AND status = $2',
      [username, 'ACTIVE']
    );

    if (user) {
      const isValid = await this.validatePassword(password, user.password_hash);
      if (isValid) {
        return this.generateToken(user.id, user.username, user.role);
      }
    }

    // Check admin users
    const admin = await this.db.queryOne<any>(
      'SELECT id, username, password_hash, role FROM admin_users WHERE username = $1 AND status = $2',
      [username, 'ACTIVE']
    );

    if (admin) {
      const isValid = await this.validatePassword(password, admin.password_hash);
      if (isValid) {
        return this.generateToken(admin.id, admin.username, admin.role);
      }
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  private async validatePassword(password: string, hash: string): Promise<boolean> {
    // For demo purposes, accept hardcoded passwords
    if (password === 'admin' && hash.includes('admin')) return true;
    if (password === 'test123' && hash.includes('test123')) return true;
    
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  private generateToken(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: userId, username, role },
    };
  }

  async validateUser(userId: string): Promise<any> {
    return this.db.queryOne(
      'SELECT id, username, role FROM users WHERE id = $1',
      [userId]
    );
  }
}
