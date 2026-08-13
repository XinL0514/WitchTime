export interface TestAccount {
  phone: string;
  password: string;
}

export function getTestAccount(role = 'default'): TestAccount {
  const suffix = role === 'default' ? '' : `_${role.toUpperCase()}`;
  const phone = process.env[`MIABI_TEST_PHONE${suffix}`];
  const password = process.env[`MIABI_TEST_PASSWORD${suffix}`];
  if (!phone || !password) {
    throw new Error(
      `MIABI_TEST_PHONE${suffix} / MIABI_TEST_PASSWORD${suffix} 未设置。参考 .env.example 配置一个可用的测试账号。`,
    );
  }
  return { phone, password };
}
