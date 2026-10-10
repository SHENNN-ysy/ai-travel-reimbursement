package com.aidemo.myaitravelreimbursement.service.impl;

import com.aidemo.myaitravelreimbursement.common.*;
import com.aidemo.myaitravelreimbursement.dto.*;
import com.aidemo.myaitravelreimbursement.entity.User;
import com.aidemo.myaitravelreimbursement.mapper.UserMapper;
import com.aidemo.myaitravelreimbursement.service.UserService;
import com.aidemo.myaitravelreimbursement.utils.JwtUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;

    @Override
    public AuthResponse register(RegisterRequest request) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, request.getUsername());
        if (userMapper.selectCount(wrapper) > 0) {
            throw new UsernameAlreadyExistsException(request.getUsername());
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(PASSWORD_ENCODER.encode(request.getPassword()));
        user.setNickname(request.getNickname() != null ? request.getNickname() : request.getUsername());
        user.setEmail(request.getEmail());
        user.setStatus(1);
        userMapper.insert(user);

        return AuthResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, request.getUsername());
        User user = userMapper.selectOne(wrapper);

        if (user == null) {
            throw new InvalidCredentialsException();
        }
        if (!passwordMatches(request.getPassword(), user)) {
            throw new InvalidCredentialsException();
        }
        if (user.getStatus() == 0) {
            throw new AccountDisabledException();
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return AuthResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .token(token)
                .build();
    }

    /**
     * 校验密码。历史数据为明文存储，校验通过后立即升级为 BCrypt 哈希。
     */
    private boolean passwordMatches(String rawPassword, User user) {
        String stored = user.getPassword();
        if (stored != null && stored.startsWith("$2")) {
            return PASSWORD_ENCODER.matches(rawPassword, stored);
        }
        if (rawPassword.equals(stored)) {
            user.setPassword(PASSWORD_ENCODER.encode(rawPassword));
            userMapper.updateById(user);
            log.info("用户[{}]的明文密码已升级为BCrypt哈希", user.getUsername());
            return true;
        }
        return false;
    }

    @Override
    public AuthResponse guestLogin() {
        String username = "guest_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);

        User user = new User();
        user.setUsername(username);
        user.setPassword(PASSWORD_ENCODER.encode(UUID.randomUUID().toString()));
        user.setNickname("临时用户");
        user.setStatus(1);
        userMapper.insert(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return AuthResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .token(token)
                .build();
    }

    @Override
    public AuthResponse getCurrentUser() {
        User user = UserContext.getUser();
        log.info(">>> getCurrentUser: UserContext.getUser()={}", user); // 加这行
        if (user == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "用户未登录");
        }
        return AuthResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .build();
    }
}
