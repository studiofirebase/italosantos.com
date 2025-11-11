/**
 * Subscriber Service
 * TODO: Implementar serviço de gerenciamento de assinantes
 */

export async function getSubscribers() {
    return [];
}

export async function updateSubscriber(id: string, data: any) {
    console.log('Update subscriber não implementado');
    return null;
}

export default { getSubscribers, updateSubscriber };
