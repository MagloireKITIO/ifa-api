import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

/**
 * Décorateur pour extraire l'utilisateur courant de la requête
 *
 * Usage:
 * - @CurrentUser() user: User - Retourne l'objet User complet
 * - @CurrentUser('id') userId: string - Retourne uniquement l'ID de l'utilisateur
 * - @CurrentUser('sub') userId: string - Alias pour 'id', retourne l'ID de l'utilisateur
 * - @CurrentUser('email') email: string - Retourne uniquement l'email
 *
 * @param data - Clé de la propriété à extraire (optionnel)
 * @param ctx - Contexte d'exécution NestJS
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    if (!data) {
      // Si aucune clé spécifiée, retourner l'objet User complet
      return user;
    }

    // Support de l'alias 'sub' pour 'id' (standard JWT)
    const key = data === 'sub' ? 'id' : data;

    // Retourner la propriété demandée
    return user?.[key];
  },
);
