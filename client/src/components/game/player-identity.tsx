import type { PlayerInfo } from 'shared';
import styles from './player-identity.module.css';

export interface PlayerIdentityProps {
  player: PlayerInfo;
  isActive: boolean;
}

function getStatusLabel(player: PlayerInfo, isActive: boolean) {
  if (!player.connected) {
    return 'disconnected';
  }

  return isActive ? 'active' : 'waiting';
}

export function PlayerIdentity({ player, isActive }: PlayerIdentityProps) {
  const statusLabel = getStatusLabel(player, isActive);
  const containerClasses = [
    styles.container,
    player.connected ? (isActive ? styles.active : styles.inactive) : styles.disconnected,
  ]
    .filter(Boolean)
    .join(' ');
  const avatarClasses = [
    styles.avatar,
    player.connected && isActive && player.symbol === 'X' ? styles.activeGlowX : '',
    player.connected && isActive && player.symbol === 'O' ? styles.activeGlowO : '',
  ]
    .filter(Boolean)
    .join(' ');
  const symbolClasses = [
    styles.symbol,
    player.symbol === 'X' ? styles.symbolX : styles.symbolO,
  ].join(' ');

  return (
    <div
      role="group"
      className={containerClasses}
      aria-label={`Player ${player.displayName}, playing as ${player.symbol}, ${statusLabel}`}
    >
      <img
        className={avatarClasses}
        src={player.avatarUrl}
        alt=""
        role="presentation"
        loading="lazy"
        width={40}
        height={40}
      />
      <div aria-hidden="true" className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name} title={player.displayName}>{player.displayName}</span>
          <span className={symbolClasses}>
            {player.symbol}
          </span>
        </div>
        {!player.connected ? (
          <span className={styles.disconnectedBadge}>Disconnected</span>
        ) : null}
      </div>
    </div>
  );
}