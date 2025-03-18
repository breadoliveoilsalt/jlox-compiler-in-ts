import { type Tokens, type Token } from '../../scanner/types';

export type Environment = {
  outerScope: null | Environment;
  [key: string]: any;
};

export type NodeBuilderParams = {
  tokens: Tokens;
  currentTokenHead: number;
};

export type NodeBuilderResult = {
  node: AstTree;
  currentTokenHead: number;
};

export type NodeBuilder = ({
  tokens,
  currentTokenHead,
}: NodeBuilderParams) => NodeBuilderResult;

export type PrimaryBuilders = {
  [key: string]: NodeBuilder;
};

export type AstTree = {
  token: Token;
  left?: AstTree;
  right?: AstTree;
  evaluate: (environment: Environment) => any;
};
