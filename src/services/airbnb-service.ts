import { AirbnbListing, AirbnbSearchParams, AirbnbApiResponse, AirbnbBookingRequest } from '@/types/airbnb';

class AirbnbService {
  private baseUrl = 'https://airbnb-com.p.rapidapi.com/v2';
  private rapidApiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '';
  private rapidApiHost = 'airbnb-com.p.rapidapi.com';

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<AirbnbApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': this.rapidApiHost,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Airbnb API Error:', error);
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async searchListings(params: AirbnbSearchParams): Promise<AirbnbApiResponse<AirbnbListing[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.location) searchParams.append('location', params.location);
    if (params.checkin) searchParams.append('checkin', params.checkin);
    if (params.checkout) searchParams.append('checkout', params.checkout);
    if (params.guests) searchParams.append('guests', params.guests.toString());
    if (params.minPrice) searchParams.append('price_min', params.minPrice.toString());
    if (params.maxPrice) searchParams.append('price_max', params.maxPrice.toString());
    if (params.propertyType) searchParams.append('property_type', params.propertyType);
    if (params.instantBook) searchParams.append('instant_book', 'true');

    return this.makeRequest<AirbnbListing[]>(`/search?${searchParams.toString()}`);
  }

  async getListingDetails(listingId: string): Promise<AirbnbApiResponse<AirbnbListing>> {
    return this.makeRequest<AirbnbListing>(`/listing/${listingId}`);
  }

  async getListingAvailability(listingId: string, month: number, year: number): Promise<AirbnbApiResponse<any>> {
    return this.makeRequest<any>(`/listing/${listingId}/availability?month=${month}&year=${year}`);
  }

  async getPopularDestinations(): Promise<AirbnbApiResponse<any[]>> {
    return this.makeRequest<any[]>('/destinations/popular');
  }

  async createBookingRequest(booking: AirbnbBookingRequest): Promise<AirbnbApiResponse<any>> {
    return this.makeRequest<any>('/booking/request', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  // Mock data para desenvolvimento/demonstração
  getMockListings(): AirbnbListing[] {
    return [
      {
        id: '1',
        title: 'Apartamento Moderno no Centro',
        description: 'Lindo apartamento com vista para a cidade, localizado no coração do centro histórico. Perfeito para casais ou viajantes de negócios.',
        price: 150,
        currency: 'BRL',
        location: {
          address: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil',
          latitude: -23.5505,
          longitude: -46.6333,
        },
        images: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500',
          'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=500',
        ],
        amenities: ['WiFi', 'Ar Condicionado', 'Cozinha', 'TV', 'Estacionamento'],
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        rating: 4.8,
        reviewCount: 127,
        host: {
          id: 'host1',
          name: 'Maria Silva',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1ab?w=100',
          isSuperhost: true,
        },
        availability: {
          checkin: '15:00',
          checkout: '11:00',
          minNights: 2,
          maxNights: 30,
        },
        rules: ['Não é permitido fumar', 'Não são permitidos animais', 'Sem festas'],
        coordinates: [-46.6333, -23.5505],
      },
      {
        id: '2',
        title: 'Casa na Praia com Piscina',
        description: 'Casa espaçosa à beira-mar com piscina privativa. Ideal para famílias que buscam relaxamento e diversão.',
        price: 300,
        currency: 'BRL',
        location: {
          address: 'Av. Atlântica, 456',
          city: 'Rio de Janeiro',
          state: 'RJ',
          country: 'Brasil',
          latitude: -22.9068,
          longitude: -43.1729,
        },
        images: [
          'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=500',
          'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=500',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
        ],
        amenities: ['WiFi', 'Piscina', 'Churrasqueira', 'Vista para o mar', 'Estacionamento'],
        bedrooms: 4,
        bathrooms: 3,
        maxGuests: 8,
        rating: 4.9,
        reviewCount: 89,
        host: {
          id: 'host2',
          name: 'João Santos',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
          isSuperhost: false,
        },
        availability: {
          checkin: '16:00',
          checkout: '12:00',
          minNights: 3,
          maxNights: 14,
        },
        rules: ['Não é permitido fumar dentro de casa', 'Animais permitidos', 'Sem música alta após 22h'],
        coordinates: [-43.1729, -22.9068],
      },
      {
        id: '3',
        title: 'Loft Industrial em Bairro Trendy',
        description: 'Loft moderno com decoração industrial em bairro jovem e vibrante. Perfeito para quem busca estilo e localização.',
        price: 200,
        currency: 'BRL',
        location: {
          address: 'Rua Augusta, 789',
          city: 'São Paulo',
          state: 'SP',
          country: 'Brasil',
          latitude: -23.5629,
          longitude: -46.6544,
        },
        images: [
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500',
          'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=500',
          'https://images.unsplash.com/photo-1560448204-e1a3ecb4d729?w=500',
        ],
        amenities: ['WiFi', 'Ar Condicionado', 'Cozinha Gourmet', 'Smart TV', 'Academia'],
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        rating: 4.7,
        reviewCount: 203,
        host: {
          id: 'host3',
          name: 'Ana Costa',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
          isSuperhost: true,
        },
        availability: {
          checkin: '14:00',
          checkout: '11:00',
          minNights: 1,
          maxNights: 7,
        },
        rules: ['Não é permitido fumar', 'Não são permitidos animais', 'Check-in automático'],
        coordinates: [-46.6544, -23.5629],
      },
    ];
  }
}

export const airbnbService = new AirbnbService();
