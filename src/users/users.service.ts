/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

export class CreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'username', 'email', 'role', 'created_at', 'updated_at'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password_hash: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async seedAdminUser(): Promise<void> {
    const existingAdmin = await this.findByUsername('admin');
    
    if (!existingAdmin) {
      await this.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: UserRole.ADMIN,
      });
    }
  }
}