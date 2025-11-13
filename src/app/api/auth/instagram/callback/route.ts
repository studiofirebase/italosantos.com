import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state');

    // Se o usuário cancelou a autorização
    if (error) {
      console.error('[Instagram Callback] Erro:', {
        error,
        errorReason,
        errorDescription
      });

      // Redirecionar para a página com mensagem de erro
      return NextResponse.redirect(
        new URL(
          `/admin/integrations?instagram_error=${encodeURIComponent(errorDescription || 'Autorização cancelada')}`,
          request.url
        )
      );
    }

    // Se não tem código, retornar erro
    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/integrations?instagram_error=no_code', request.url)
      );
    }

    console.log('[Instagram Callback] Código recebido:', code.substring(0, 10) + '...');

    // Redirecionar de volta para a página de integrações com o código
    // O frontend vai processar o código
    return NextResponse.redirect(
      new URL(
        `/admin/integrations?instagram_code=${code}${state ? `&state=${state}` : ''}`,
        request.url
      )
    );
  } catch (error) {
    console.error('[Instagram Callback] Erro ao processar callback:', error);
    return NextResponse.redirect(
      new URL('/admin/integrations?instagram_error=callback_error', request.url)
    );
  }
}
