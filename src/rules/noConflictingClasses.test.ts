import { RuleTester } from '@typescript-eslint/rule-tester'
import { noConflictingClassesRule } from './noConflictingClasses'



const ruleTester = new RuleTester()

ruleTester.run('no-conflicting-classes', noConflictingClassesRule as never, {
  valid: [
    // Different CSS properties
    { code: 'cn("flex items-center")' },
    { code: 'cn("p-4 m-2")' },
    { code: 'cn("text-red-500 bg-blue-500")' },

    // Different variants (no conflict)
    { code: 'cn("flex hover:block")' },
    { code: 'cn("md:flex lg:block")' },
    { code: 'cn("text-red-500 hover:text-blue-500")' },
  ],

  invalid: [
    // Same CSS property (display)
    {
      code: 'cn("flex block")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("block")',
    },
    {
      code: 'cn("hidden block")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("block")',
    },

    // Same CSS property (color)
    {
      code: 'cn("text-red-500 text-blue-500")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("text-blue-500")',
    },

    // Same CSS property (padding)
    {
      code: 'cn("p-4 p-8")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("p-8")',
    },

    // Same variant + same property = conflict
    {
      code: 'cn("hover:flex hover:block")',
      errors: [{ messageId: 'conflict' }],
      output: 'cn("hover:block")',
    },

    // Multiple conflicts
    {
      code: 'cn("flex block text-red-500 text-blue-500")',
      errors: [{ messageId: 'conflict' }, { messageId: 'conflict' }],
      output: 'cn("block text-blue-500")',
    },
  ],
})
