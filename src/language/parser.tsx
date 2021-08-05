import { Ast } from './ast'

const varr = (name: string): Ast => ({ type: 'variable', name });
export function parse(code: string): Ast[] {
    return [
        {
            type: 'foreach',
            itemvar: varr('item'),
            list: {
                type: "list",
                items: [
                    varr('a'), varr('b'), varr('c')
                ]
            },
            block: [
                {
                    type: 'exprstat', expr: {
                        type: 'call',
                        procedure: varr('DISPLAY'),
                        paramaters: [varr('item')]
                    }
                }
            ]
        }
    ]
}
