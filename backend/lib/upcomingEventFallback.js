const date = value => new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Colombo" });

function upcomingEventFallback(records) {
  const noUpcomingEvents = "Events:\nThere are no upcoming events at the moment";
  if (!records.length) return noUpcomingEvents + ".";

  const eventDetails = records.map(record =>
    `${record.title} - ${date(record.date)}, ${record.time}, ${record.location}. ${record.description}`
  );
  return [noUpcomingEvents + ", but here are the latest campus events available:", ...eventDetails].join("\n");
}

module.exports = { upcomingEventFallback };
