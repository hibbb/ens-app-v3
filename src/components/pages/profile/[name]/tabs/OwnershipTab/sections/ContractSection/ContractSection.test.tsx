import { render, screen } from '@app/test-utils'

import { BreakpointProvider, useBreakpoint } from '@app/utils/BreakpointProvider'

import { ContractSection } from './ContractSection'

jest.mock('@app/hooks/chain/useContractAddress', () => ({
  useContractAddress: () => '0xnamewrapper',
}))

jest.mock('@app/utils/BreakpointProvider', () => ({
  useBreakpoint: () => ({
    xs: true,
    sm: true,
    md: true,
    lg: false,
    xl: false,
  }),
}))

describe('ContractSection', () => {
  it('should display if details.isWrapped is true', async () => {
    render(<ContractSection details={{ isWrapped: true } as any} />)
    expect(screen.getByText('0xnamewrapper')).toBeVisible()
  })

  it('should not display if details.isWrapped is false', async () => {
    render(<ContractSection details={{ isWrapped: false } as any} />)
    expect(screen.queryByText('0xnamewrapper')).toEqual(null)
  })
})
