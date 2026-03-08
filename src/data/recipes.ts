export interface Recipe {
  id: string;
  name: string;
  image: string;
  cookTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  ingredients: string[];
  tags: string[];
  instructions: string[];
}

export const recipes: Recipe[] = [
  {
    id: '1',
    name: 'Spicy Honey Garlic Chicken',
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=400&fit=crop',
    cookTime: '35 min',
    difficulty: 'Intermediate',
    ingredients: ['chicken thighs', 'honey', 'garlic', 'soy sauce', 'sriracha', 'rice', 'sesame seeds', 'green onions'],
    tags: ['spicy', 'savory', 'umami'],
    instructions: [
      'Season chicken thighs with salt and pepper.',
      'Sear chicken in a hot pan until golden, about 4 min per side.',
      'Mix honey, garlic, soy sauce, and sriracha in a bowl.',
      'Pour sauce over chicken and simmer 15 minutes.',
      'Serve over steamed rice, topped with sesame seeds and green onions.',
    ],
  },
  {
    id: '2',
    name: 'Creamy Tuscan Salmon',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop',
    cookTime: '25 min',
    difficulty: 'Intermediate',
    ingredients: ['salmon fillets', 'sun-dried tomatoes', 'spinach', 'heavy cream', 'garlic', 'parmesan', 'olive oil'],
    tags: ['savory', 'umami'],
    instructions: [
      'Sear salmon in olive oil until crispy, 3 min per side. Set aside.',
      'Sauté garlic and sun-dried tomatoes in the same pan.',
      'Add spinach and wilt, then pour in heavy cream.',
      'Stir in parmesan until melted and sauce thickens.',
      'Return salmon to pan and spoon sauce over top.',
    ],
  },
  {
    id: '3',
    name: 'Thai Basil Tofu Stir-Fry',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=400&fit=crop',
    cookTime: '20 min',
    difficulty: 'Beginner',
    ingredients: ['firm tofu', 'thai basil', 'bell pepper', 'soy sauce', 'garlic', 'chili flakes', 'vegetable oil', 'rice'],
    tags: ['spicy', 'savory', 'vegetarian'],
    instructions: [
      'Press tofu and cut into cubes.',
      'Fry tofu in vegetable oil until golden and crispy.',
      'Stir-fry garlic, bell pepper, and chili flakes.',
      'Add soy sauce and toss everything together.',
      'Fold in fresh thai basil and serve over rice.',
    ],
  },
  {
    id: '4',
    name: 'Lemon Herb Mediterranean Bowl',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
    cookTime: '30 min',
    difficulty: 'Beginner',
    ingredients: ['quinoa', 'cucumber', 'cherry tomatoes', 'feta cheese', 'lemon', 'olive oil', 'chickpeas', 'red onion'],
    tags: ['fresh', 'savory', 'vegetarian'],
    instructions: [
      'Cook quinoa according to package directions.',
      'Dice cucumber, halve tomatoes, and slice red onion.',
      'Drain and rinse chickpeas.',
      'Whisk lemon juice and olive oil for dressing.',
      'Assemble bowls and crumble feta on top.',
    ],
  },
  {
    id: '5',
    name: 'Chocolate Lava Cakes',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&h=400&fit=crop',
    cookTime: '25 min',
    difficulty: 'Advanced',
    ingredients: ['dark chocolate', 'butter', 'eggs', 'sugar', 'flour', 'vanilla extract'],
    tags: ['sweet'],
    instructions: [
      'Melt chocolate and butter together.',
      'Whisk eggs and sugar until fluffy.',
      'Fold chocolate mixture into eggs, then add flour and vanilla.',
      'Pour into greased ramekins.',
      'Bake at 425°F for 12–14 minutes until edges are set but center jiggles.',
    ],
  },
  {
    id: '6',
    name: 'Korean Beef Bibimbap',
    image: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=600&h=400&fit=crop',
    cookTime: '40 min',
    difficulty: 'Intermediate',
    ingredients: ['ground beef', 'rice', 'carrots', 'spinach', 'eggs', 'gochujang', 'sesame oil', 'soy sauce'],
    tags: ['spicy', 'umami', 'savory'],
    instructions: [
      'Cook rice and set aside.',
      'Brown ground beef with soy sauce and sesame oil.',
      'Sauté carrots and blanch spinach separately.',
      'Fry an egg sunny-side up.',
      'Assemble bowls: rice, veggies, beef, egg, and a dollop of gochujang.',
    ],
  },
  {
    id: '7',
    name: 'Mango Coconut Chia Pudding',
    image: 'https://images.unsplash.com/photo-1546039907-7e6588d26cce?w=600&h=400&fit=crop',
    cookTime: '10 min + overnight',
    difficulty: 'Beginner',
    ingredients: ['chia seeds', 'coconut milk', 'mango', 'honey', 'vanilla extract'],
    tags: ['sweet', 'fresh', 'vegan'],
    instructions: [
      'Mix chia seeds with coconut milk, honey, and vanilla.',
      'Stir well and refrigerate overnight.',
      'Dice fresh mango.',
      'Top pudding with mango in the morning.',
      'Enjoy cold!',
    ],
  },
];
