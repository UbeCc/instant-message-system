// jest.setup.js

// 使用 require 语句代替 import，如果你的环境不支持 ES6 模块语法
const { toBeInTheDocument, toHaveClass } = require('@testing-library/jest-dom/matchers');

// 添加 jest-dom 的自定义断言
expect.extend({ toBeInTheDocument, toHaveClass });

// 或者，如果你想要一次性导入所有 jest-dom 的扩展
require('@testing-library/jest-dom/extend-expect');