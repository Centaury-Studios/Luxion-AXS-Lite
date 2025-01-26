// app/api/ai/free/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('=== Request Start ===');
    console.log('Request type:', body.type);
    console.log('Request body:', body.data);

    // La URL base depende del tipo de operación
    const baseUrl = body.type === 'image_generation' 
      ? 'https://api.ddc.xiolabs.xyz/v1/images/generations'
      : 'https://api.ddc.xiolabs.xyz/v1/chat/completions';

    console.log('Requesting to URL:', baseUrl);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer Free-For-YT-Subscribers-@DevsDoCode-WatchFullVideo',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body.data)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    // Log de la respuesta cruda
    const responseText = await response.text();
    console.log('Raw response text:', responseText);

    // Solo intentar parsear si hay contenido
    let data = null;
    try {
      if (responseText) {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      // Si la respuesta no es JSON, podría ser la URL directa
      if (responseText.trim().startsWith('http')) {
        console.log('Response appears to be a direct URL');
        return NextResponse.json({ url: responseText.trim() });
      }
      return NextResponse.json({ error: 'Invalid JSON response', raw: responseText }, { status: 500 });
    }

    if (!response.ok) {
      console.error('API error response:', data);
      throw new Error(data?.error?.message || 'Error en la API');
    }

    console.log('=== Request End ===');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Complete error:', error);
    return NextResponse.json(
      { error: error.message || 'Error procesando la petición' },
      { status: 500 }
    );
  }
}