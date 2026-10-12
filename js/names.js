// Made-up player names. Big pools so the league doesn't feel copy-pasted:
// every last name is used once across the whole league, and no team has two players with the same first name.
(function (G) {
  const A = G.ADFL;

  const FIRST = ['Aaron', 'Abdul', 'Adrian', 'Ahmad', 'Alonzo', 'Amari', 'Andre', 'Angelo', 'Anthony', 'Ari', 'Armando', 'Arlo', 'Asher', 'August', 'Avery',
    'Barrett', 'Beau', 'Bennett', 'Blake', 'Bo', 'Boris', 'Brady', 'Brantley', 'Brock', 'Bruno', 'Byron', 'Caden', 'Calvin', 'Camden', 'Carlos', 'Carson',
    'Cedric', 'Chase', 'Clay', 'Clint', 'Cole', 'Colby', 'Conrad', 'Cooper', 'Cruz', 'Curtis', 'Dakota', 'Dallas', 'Damian', 'Darnell', 'Davion', 'Deacon',
    'Dedric', 'Demarcus', 'Denzel', 'Desmond', 'Diego', 'Dmitri', 'Donovan', 'Dorian', 'Drew', 'Duke', 'Dwight', 'Easton', 'Eddie', 'Elias', 'Elijah',
    'Emeka', 'Emmett', 'Enzo', 'Ezra', 'Fabian', 'Finn', 'Floyd', 'Francisco', 'Frankie', 'Gabe', 'Garrett', 'Gavin', 'Gianni', 'Grady', 'Graham', 'Gunnar',
    'Harlan', 'Hector', 'Henry', 'Hollis', 'Hudson', 'Ike', 'Isaiah', 'Ismael', 'Jabari', 'Jace', 'Jalen', 'Jamir', 'Jarvis', 'Javier', 'Jaxon', 'Jesse',
    'Joaquin', 'Jonah', 'Jordan', 'Josiah', 'Julian', 'Kai', 'Kaleb', 'Kareem', 'Keenan', 'Keon', 'Kingston', 'Knox', 'Kofi', 'Kwame', 'Lance', 'Lawson',
    'Lennox', 'Leon', 'Levi', 'Lincoln', 'Lionel', 'Lorenzo', 'Luca', 'Luis', 'Maddox', 'Malachi', 'Manny', 'Marco', 'Mateo', 'Maverick', 'Max', 'Memphis',
    'Milo', 'Moses', 'Nate', 'Nico', 'Noah', 'Oakley', 'Odell', 'Orlando', 'Oscar', 'Owen', 'Pablo', 'Parker', 'Quentin', 'Rafael', 'Ralph', 'Ray', 'Reed',
    'Reggie', 'Rhett', 'Ricky', 'Rocco', 'Rodney', 'Roman', 'Ronan', 'Rowan', 'Ruben', 'Russell', 'Ryder', 'Sal', 'Santiago', 'Sawyer', 'Sebastian', 'Shane',
    'Shawn', 'Simon', 'Sterling', 'Tariq', 'Tate', 'Teddy', 'Theo', 'Tobias', 'Tommy', 'Travis', 'Tristan', 'Tucker', 'Tyson', 'Uriah', 'Vince', 'Wade',
    'Walker', 'Warren', 'Wendell', 'Wyatt', 'Xander', 'Yusuf', 'Zach', 'Zion'];

  const LAST = ['Abara', 'Ackerman', 'Adeyemi', 'Aguilar', 'Alcott', 'Aldana', 'Ambrose', 'Amos', 'Ansel', 'Appleby', 'Arceneaux', 'Ashby', 'Atwater', 'Avalos',
    'Babcock', 'Bakari', 'Baldwin', 'Barlowe', 'Basquez', 'Beale', 'Beaumont', 'Bellamy', 'Benitez', 'Birch', 'Blackwood', 'Blanchard', 'Boateng', 'Bonner',
    'Booker', 'Boudreaux', 'Bramwell', 'Breaux', 'Briscoe', 'Broadnax', 'Buckley', 'Burrell', 'Byrd', 'Cabrera', 'Caldwell', 'Camacho', 'Carrington', 'Castillo',
    'Chalmers', 'Chandler', 'Chisholm', 'Cisneros', 'Clayborn', 'Cobb', 'Colquitt', 'Corbin', 'Cordero', 'Cornish', 'Costa', 'Crenshaw', 'Crisp', 'Culpepper',
    'Dacosta', 'Dalton', 'Danforth', 'Darby', 'Delacroix', 'Demps', 'Dixon', 'Dorsett', 'Draper', 'Dube', 'Dunbar', 'Duncan', 'Eason', 'Eckert', 'Edmonds',
    'Ellington', 'Emerson', 'Escobar', 'Espinoza', 'Everly', 'Ezeli', 'Fairbanks', 'Falcone', 'Farrow', 'Faulk', 'Felder', 'Fenwick', 'Figueroa', 'Finch',
    'Flanagan', 'Fleming', 'Flowers', 'Ford', 'Foreman', 'Fortune', 'Fowler', 'Frazier', 'Fuentes', 'Gallo', 'Galloway', 'Garnett', 'Gentry', 'Gibbs',
    'Gilliam', 'Goodwin', 'Grimes', 'Guerrero', 'Gutierrez', 'Hadley', 'Haggerty', 'Halsey', 'Hamlin', 'Harbor', 'Hargrove', 'Haskins', 'Hatcher', 'Haywood',
    'Hendrix', 'Hightower', 'Hinton', 'Holcomb', 'Horne', 'Houston', 'Huckabee', 'Ibekwe', 'Iglesias', 'Irons', 'Isom', 'Jacoby', 'Jamison', 'Jefferson',
    'Jett', 'Jimenez', 'Joiner', 'Juarez', 'Kamara', 'Keane', 'Keener', 'Kendrick', 'Kimble', 'Kingsbury', 'Kirkland', 'Knowles', 'Koenig', 'Lacey', 'Lambert',
    'Landry', 'Langston', 'Larkin', 'Lattimore', 'Ledbetter', 'Lemaire', 'Lindqvist', 'Lofton', 'Lopez', 'Lowery', 'Lyles', 'Macklin', 'Madrigal', 'Malone',
    'Manzo', 'Marchetti', 'Marlowe', 'Mathis', 'Maxwell', 'Mayfield', 'McBride', 'McCray', 'McGee', 'Medina', 'Mendoza', 'Merriweather', 'Middleton', 'Monroe',
    'Montoya', 'Moody', 'Morales', 'Mosley', 'Mwangi', 'Navarro', 'Nelson', 'Newsome', 'Nightingale', 'Noble', 'Norwood', 'Nwosu', 'Oakes', 'Obi', 'Ochoa',
    'Odum', 'Ogunleye', 'Oliveira', 'Orozco', 'Osborne', 'Otis', 'Overton', 'Pace', 'Padilla', 'Palmer', 'Parrish', 'Patton', 'Paxton', 'Pemberton',
    'Pendleton', 'Petrov', 'Pickens', 'Pierce', 'Pinkston', 'Plummer', 'Poe', 'Pollard', 'Prather', 'Pryor', 'Quintana', 'Quinlan', 'Raines', 'Ramos',
    'Randle', 'Rasheed', 'Redd', 'Reese', 'Renfro', 'Reyes', 'Rhodes', 'Rios', 'Rivers', 'Roach', 'Robles', 'Rocha', 'Rook', 'Rosales', 'Royster', 'Ruffin',
    'Salazar', 'Sampson', 'Santos', 'Sawyers', 'Scarbrough', 'Sellers', 'Serrano', 'Shackelford', 'Sharpe', 'Shelton', 'Simmons', 'Singletary', 'Slade',
    'Sloan', 'Snead', 'Sosa', 'Spalding', 'Sparks', 'Stallworth', 'Steele', 'Stokes', 'Strickland', 'Suarez', 'Sullivan', 'Swann', 'Tabor', 'Talbot',
    'Tanaka', 'Tavares', 'Teague', 'Terrell', 'Thibodeaux', 'Thornton', 'Toliver', 'Torres', 'Townsend', 'Trejo', 'Tubbs', 'Turnbull', 'Ulmer', 'Usher',
    'Valdez', 'Vargas', 'Vaughn', 'Vega', 'Villanueva', 'Waddell', 'Wainwright', 'Walden', 'Warrick', 'Watkins', 'Weatherspoon', 'Webb', 'Wells', 'Westbrook',
    'Whitlock', 'Wilder', 'Winslow', 'Woodard', 'Worthy', 'Wright', 'Yancey', 'Yeboah', 'Yoder', 'Youngblood', 'Zamora', 'Zayas', 'Zuniga'];

  // players: [{ id, team }] in a fixed order. Returns { id: 'First Last' }.
  A.uniqueNames = function (players, seed) {
    const r = A.rng(seed * 9973 + 4242);
    const lasts = A.shuffle([...new Set(LAST)], r);
    const firstByTeam = {};
    const out = {};
    players.forEach((p, i) => {
      const k = p.team || 'FA';
      if (!firstByTeam[k] || !firstByTeam[k].length) firstByTeam[k] = A.shuffle(FIRST.slice(), r);
      out[p.id] = firstByTeam[k].pop() + ' ' + lasts[i % lasts.length];
    });
    return out;
  };
  A.NAME_POOL_SIZE = { first: FIRST.length, last: new Set(LAST).size };
})(globalThis);
