interface LogoProps {
  inverted?: boolean;
  size?: number;
}

export function Logo({ inverted = false, size = 28 }: LogoProps) {
  const src = inverted
    ? "/brand/svg/lockup/lockup-horizontal-on-dark.svg"
    : "/brand/svg/lockup/lockup-horizontal-green.svg";

  return (
    <img
      src={src}
      alt="Renofine"
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}
