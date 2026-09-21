import { Injectable, signal } from '@angular/core';
import { INITIAL_CLIENTS } from './clients.data';
import { Client, ClientInput } from './clients.model';

@Injectable({ providedIn: 'root' })
export class ClientsStore {
  private readonly storageKey = 'mahenintsoa-events.clients.v1';
  readonly storageMessage = signal('');
  private readonly items = signal<Client[]>(this.load());
  readonly clients = this.items.asReadonly();

  constructor() {
    try {
      if (!this.storageMessage() && localStorage.getItem(this.storageKey) === null) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items()));
      }
    } catch {
      this.storageMessage.set('Impossible d’initialiser les clients dans le navigateur.');
    }
  }

  private isValid(value: unknown): value is Client {
    if (!value || typeof value !== 'object') return false;
    const item = value as Client;
    return (
      Number.isSafeInteger(item.id) &&
      item.id > 0 &&
      [item.nomOuRaisonSociale, item.telephone, item.adresse].every(
        (field) => typeof field === 'string' && !!field.trim() && field.length <= 200,
      ) &&
      [item.cin, item.nif, item.stat].every(
        (field) =>
          field === null || (typeof field === 'string' && !!field.trim() && field.length <= 80),
      )
    );
  }

  private load(): Client[] {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved !== null) {
        const items: unknown = JSON.parse(saved);
        if (
          !Array.isArray(items) ||
          !items.every((item) => this.isValid(item)) ||
          new Set(items.map((item) => item.id)).size !== items.length
        ) {
          throw new Error('Invalid clients');
        }
        // Update only the original sample addresses, preserving user edits.
        const previousAddresses = [
          'Analakely, Antananarivo',
          'Ivandry, Antananarivo',
          'Ambohimanarina, Antananarivo',
          'Talatamaty, Antananarivo',
          'By-Pass, Antananarivo',
          'Ankorondrano, Antananarivo',
          'Andraharo, Antananarivo',
        ];
        const updated = items.map((item) => {
          const initial = INITIAL_CLIENTS.find(
            (client) =>
              client.id === item.id && client.nomOuRaisonSociale === item.nomOuRaisonSociale,
          );
          return initial && item.adresse === previousAddresses[item.id - 1]
            ? { ...item, adresse: initial.adresse }
            : item;
        });
        if (updated.some((item, index) => item !== items[index])) {
          try {
            localStorage.setItem(this.storageKey, JSON.stringify(updated));
          } catch {
            this.storageMessage.set(
              'Impossible de sauvegarder les adresses actualisées dans le navigateur.',
            );
          }
        }
        return updated;
      }
    } catch {
      this.storageMessage.set(
        'Les données locales ne sont pas accessibles. La liste initiale est affichée.',
      );
    }
    return INITIAL_CLIENTS.map((item) => ({ ...item }));
  }

  save(input: ClientInput, id?: number): Client {
    const item: Client = {
      id: id ?? Math.max(0, ...this.items().map((item) => item.id)) + 1,
      nomOuRaisonSociale: input.nomOuRaisonSociale.trim(),
      telephone: input.telephone.trim(),
      adresse: input.adresse.trim(),
      cin: input.cin?.trim() || null,
      nif: input.nif?.trim() || null,
      stat: input.stat?.trim() || null,
    };
    if (!this.isValid(item))
      throw new Error('Veuillez renseigner correctement tous les champs obligatoires.');
    if (id !== undefined && !this.items().some((existing) => existing.id === id))
      throw new Error('Client introuvable.');
    const next =
      id === undefined
        ? [item, ...this.items()]
        : this.items().map((existing) => (existing.id === id ? item : existing));
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(next));
    } catch {
      throw new Error(
        'Enregistrement impossible dans le navigateur. Libérez de l’espace puis réessayez.',
      );
    }
    this.items.set(next);
    this.storageMessage.set('');
    return item;
  }
}
