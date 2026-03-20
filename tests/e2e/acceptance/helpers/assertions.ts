import { expect, type Page } from '@playwright/test';
import { getCellSymbol, type CellSymbol } from './game-actions';

export type BoardGrid = [
  [CellSymbol, CellSymbol, CellSymbol],
  [CellSymbol, CellSymbol, CellSymbol],
  [CellSymbol, CellSymbol, CellSymbol],
];

export async function readBoardStateFromDom(page: Page): Promise<BoardGrid> {
  const rows: CellSymbol[][] = [];

  for (let row = 0; row < 3; row += 1) {
    const currentRow: CellSymbol[] = [];
    for (let col = 0; col < 3; col += 1) {
      currentRow.push(await getCellSymbol(page, row, col));
    }
    rows.push(currentRow);
  }

  return rows as BoardGrid;
}

export async function verifyBoardStateEquals(page: Page, expected: BoardGrid): Promise<void> {
  await expect
    .poll(async () => readBoardStateFromDom(page))
    .toEqual(expected);
}

export async function verifyOutcomeModalText(page: Page, expected: RegExp): Promise<void> {
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText(expected);
}

export async function verifyChatMessagePresence(page: Page, expectedText: string): Promise<void> {
  await expect(page.getByRole('log').getByText(expectedText)).toBeVisible();
}
