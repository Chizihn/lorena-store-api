const getTimeLeftBeforeExpiration = (expirationTime: Date): string => {
  const currentTime = new Date();
  const timeDifference = expirationTime.getTime() - currentTime.getTime(); // Difference in milliseconds

  if (timeDifference <= 0) {
    return "Token has expired";
  }

  // Convert milliseconds to minutes and seconds
  const minutesLeft = Math.floor(timeDifference / 60000); // 60,000 ms in a minute
  const secondsLeft = Math.floor((timeDifference % 60000) / 1000); // Remaining seconds after minutes

  return `${minutesLeft} minutes and ${secondsLeft} seconds left`;
};
