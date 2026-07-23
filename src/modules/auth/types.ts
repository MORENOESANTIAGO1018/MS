export interface AuthActionResult {
  success: boolean;
  /** Mensagem em portugues, segura para exibir ao usuario (nunca detalhe interno). */
  message: string;
}

export interface CreateInviteResult extends AuthActionResult {
  clientAccessId?: string;
}
