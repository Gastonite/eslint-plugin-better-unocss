import { RuleTester } from '@typescript-eslint/rule-tester'
import { orderRule } from './order'

const ruleTester = new RuleTester()

ruleTester.run('order', orderRule as never, {
  valid: [
    { code: 'cn("p-4")' },
    { code: 'cn("")' },
    { code: 'otherFn("mt-2 p-4")' }, // not a tracked function
  ],
  invalid: [
    {
      code: 'cn("mt-2 p-4 flex")',
      errors: [{ messageId: 'unordered' }],
      output: 'cn("mt-2 flex p-4")',
    },
    {
      code: 'clsx("text-red-500 flex p-4")',
      errors: [{ messageId: 'unordered' }],
      output: 'clsx("flex p-4 text-red-500")',
    },
  ],
})
